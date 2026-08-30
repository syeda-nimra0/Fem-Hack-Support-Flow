import { Router } from 'express';
import config, { CATEGORIES, PRIORITIES, STATUSES, STATUS_LABELS } from '../config.js';
import { requireAuth, requireRole, asyncHandler } from '../auth.js';
import {
  User,
  Ticket,
  Message,
  nextTicketNumber,
  serializeTicket,
  serializeMessage,
  serializeUserRef,
} from '../models.js';
import { runTriage, buildResolutionPrompt, similarityScore } from '../ai/triage.js';
import { generateJson } from '../ai/provider.js';
import { emitToTicket, emitToRoles, emitToUser } from '../socket.js';

const router = Router();
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function loadTicketForViewer(id, user, { allowUnassignedAgent = false } = {}) {
  if (!/^[a-f\d]{24}$/i.test(String(id))) throw new HttpError(404, 'Ticket not found.');
  const ticket = await Ticket.findById(id).populate('customer').populate('assignedAgent');
  if (!ticket) throw new HttpError(404, 'Ticket not found.');

  if (user.role === 'admin') return ticket;
  if (user.role === 'agent') {
    if (allowUnassignedAgent) return ticket; // agents can view the unassigned queue
    if (ticket.assignedAgent && ticket.assignedAgent._id.toString() === user.id) return ticket;
  }
  if (user.role === 'customer' && ticket.customer._id.toString() === user.id) return ticket;
  throw new HttpError(403, 'You do not have access to this ticket.');
}

async function addSystemMessage(ticket, content, io) {
  const message = await Message.create({
    ticket: ticket._id,
    sender: { id: null, name: 'SupportFlow', role: 'system' },
    content,
    type: 'system',
  });
  await Ticket.updateOne({ _id: ticket._id }, { $set: { lastMessageAt: message.createdAt } });
  if (io) emitToTicket(io, ticket._id.toString(), 'message:new', { message: serializeMessage(message) });
  return message;
}

function assertNotResolved(ticket) {
  if (ticket.status === 'resolved') {
    throw new HttpError(409, 'This ticket is resolved and locked. Reopen it to continue the conversation.');
  }
}

// ---------------------------------------------------------------------------
// GET /api/tickets — role-scoped listing
// ---------------------------------------------------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { status, priority, category, q, scope } = req.query;

    const filter = {};
    if (status && STATUSES.includes(status)) filter.status = status;
    if (priority && PRIORITIES.includes(priority)) filter.priority = priority;
    if (category && CATEGORIES.includes(category)) filter.category = category;

    if (user.role === 'customer') {
      filter.customer = user.id;
    } else if (user.role === 'agent') {
      if (scope === 'mine') filter.assignedAgent = user.id;
      else if (scope === 'pool') filter.assignedAgent = null;
      else filter.$or = [{ assignedAgent: user.id }, { assignedAgent: null }];
    } else if (scope === 'pool') {
      filter.assignedAgent = null;
    }

    let query = Ticket.find(filter).populate('customer').populate('assignedAgent').sort({ updatedAt: -1 });
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query = query.where({ $or: [{ subject: rx }, { ticketNumber: rx }] });
    }
    const tickets = await query.limit(200).exec();

    const customerIds = [...new Set(tickets.map((t) => t.customer?._id?.toString()).filter(Boolean))];
    const unreadCounts = await Message.aggregate([
      { $match: { ticket: { $in: tickets.map((t) => t._id) }, type: 'message' } },
      { $group: { _id: '$ticket', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(unreadCounts.map((row) => [row._id.toString(), row.count]));

    res.json({
      tickets: tickets.map((t) => ({
        ...serializeTicket(t),
        messageCount: countMap.get(t._id.toString()) || 0,
      })),
      scope: user.role === 'customer' ? 'own' : scope || 'all',
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets — customer creates a ticket (AI triage attached, pending review)
// ---------------------------------------------------------------------------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req;
    if (user.role !== 'customer' && user.role !== 'admin') {
      throw new HttpError(403, 'Only customers can create tickets.');
    }

    const { subject, description, category } = req.body || {};
    const errors = {};
    if (!subject || String(subject).trim().length < 5) errors.subject = 'Subject must be at least 5 characters.';
    if (!description || String(description).trim().length < 10) errors.description = 'Please describe your issue (at least 10 characters).';
    if (category && !CATEGORIES.includes(category)) errors.category = 'Invalid category.';
    if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed.', errors);

    const ticketNumber = await nextTicketNumber();

    // AI triage (non-blocking failure — manual handling always allowed)
    let aiSuggestion;
    try {
      const suggestion = await runTriage({ subject, description, customerCategory: category });
      aiSuggestion = suggestion;
    } catch {
      aiSuggestion = {
        category: category || null,
        priority: null,
        summary: '',
        suggestedResponse: '',
        sentiment: 'Neutral',
        provider: 'none',
        error: 'AI service was unavailable. The agent will triage this ticket manually.',
      };
    }

    let assignedAgent = null;
    let status = 'new';

    // Bonus: automatic assignment based on category (least-loaded matching agent)
    if (config.autoAssign) {
      const agents = await User.find({ role: 'agent' });
      const targetCategory = aiSuggestion.category || category || 'General';
      const withExpertise = agents.filter((a) => (a.expertise || []).includes(targetCategory));
      const candidates = withExpertise.length ? withExpertise : agents;
      if (candidates.length) {
        const loads = await Ticket.aggregate([
          { $match: { assignedAgent: { $in: candidates.map((c) => c._id) }, status: { $ne: 'resolved' } } },
          { $group: { _id: '$assignedAgent', count: { $sum: 1 } } },
        ]);
        const loadMap = new Map(loads.map((l) => [l._id.toString(), l.count]));
        assignedAgent = candidates.sort(
          (a, b) => (loadMap.get(a._id.toString()) || 0) - (loadMap.get(b._id.toString()) || 0)
        )[0];
        status = 'assigned';
      }
    }

    const ticket = await Ticket.create({
      ticketNumber,
      subject: String(subject).trim(),
      description: String(description).trim(),
      customer: user.id,
      category: category || aiSuggestion.category || 'General',
      priority: aiSuggestion.priority || 'Medium',
      status,
      assignedAgent,
      aiSuggestion,
    });

    await addSystemMessage(
      ticket,
      `Ticket ${ticket.ticketNumber} created${aiSuggestion.provider && aiSuggestion.provider !== 'none' ? ` — AI triage (${aiSuggestion.provider}) suggests ${aiSuggestion.category || '—'} / ${aiSuggestion.priority || '—'} priority, pending agent review` : ' — AI triage unavailable, agent will triage manually'}.`,
      req.app.get('io')
    );

    const populated = await Ticket.findById(ticket._id).populate('customer').populate('assignedAgent');
    const payload = { ticket: serializeTicket(populated) };
    emitToRoles(req.app.get('io'), ['agent', 'admin'], 'ticket:new', payload);
    emitToUser(req.app.get('io'), user.id, 'ticket:new', payload);
    res.status(201).json(payload);
  })
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — ticket detail + conversation
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: true });
    const allMessages = await Message.find({ ticket: ticket._id }).sort({ createdAt: 1 }).limit(500);
    const messages = allMessages.filter((m) => (m.type === 'note' ? ['agent', 'admin'].includes(req.user.role) : true));
    res.json({ ticket: serializeTicket(ticket), messages: messages.map(serializeMessage) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/messages — reply in the conversation
// ---------------------------------------------------------------------------
router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const ticket = await loadTicketForViewer(req.params.id, user, { allowUnassignedAgent: false });
    const { content, type } = req.body || {};

    if (!content || String(content).trim().length < 1) throw new HttpError(400, 'Message cannot be empty.');
    if (type === 'note' && !['agent', 'admin'].includes(user.role)) throw new HttpError(403, 'Internal notes are for agents only.');
    assertNotResolved(ticket);

    // Agents may only reply on tickets assigned to them
    if (user.role === 'agent' && (!ticket.assignedAgent || ticket.assignedAgent._id.toString() !== user.id)) {
      throw new HttpError(403, 'Claim this ticket before replying to the customer.');
    }

    const message = await Message.create({
      ticket: ticket._id,
      sender: { id: user.id, name: user.name, role: user.role },
      content: String(content).trim(),
      type: type === 'note' ? 'note' : 'message',
    });

    const updates = { lastMessageAt: message.createdAt };
    // Auto-advance workflow: agent reply moves assigned → in progress
    if (user.role !== 'customer' && type !== 'note' && ['assigned'].includes(ticket.status)) {
      updates.status = 'in_progress';
    }
    const updated = await Ticket.findByIdAndUpdate(ticket._id, { $set: updates }, { new: true })
      .populate('customer')
      .populate('assignedAgent');

    const io = req.app.get('io');
    emitToTicket(io, ticket._id.toString(), 'message:new', { message: serializeMessage(message) });
    emitToTicket(io, ticket._id.toString(), 'ticket:updated', { ticket: serializeTicket(updated), reason: 'new-message' });
    // Notify the counterpart's dashboard even if they are not in the ticket room
    emitToUser(io, updated.customer._id.toString(), 'ticket:activity', { ticketId: ticket._id.toString() });
    if (updated.assignedAgent) emitToUser(io, updated.assignedAgent._id.toString(), 'ticket:activity', { ticketId: ticket._id.toString() });

    res.status(201).json({ message: serializeMessage(message), ticket: serializeTicket(updated) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/review — agent reviews / edits the AI suggestion
// ---------------------------------------------------------------------------
router.post(
  '/:id/review',
  requireRole('agent', 'admin'),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: true });
    const { category, priority, summary, suggestedResponse, takeTicket } = req.body || {};

    // Validate the (possibly edited) AI output before storing — business rule
    const errors = {};
    if (!CATEGORIES.includes(category)) errors.category = 'Invalid category.';
    if (!PRIORITIES.includes(priority)) errors.priority = 'Invalid priority.';
    if (!summary || String(summary).trim().length < 5) errors.summary = 'Summary is required (min 5 characters).';
    if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed.', errors);

    const updates = {
      'aiSuggestion.category': category,
      'aiSuggestion.priority': priority,
      'aiSuggestion.summary': String(summary).trim().slice(0, 300),
      'aiSuggestion.suggestedResponse': String(suggestedResponse || '').trim().slice(0, 600),
      'aiSuggestion.reviewed': true,
      'aiSuggestion.reviewedBy': req.user.id,
      'aiSuggestion.reviewedAt': new Date(),
      category,
      priority,
    };

    // "Approve & take" assigns the reviewing agent and advances the workflow
    if (takeTicket && req.user.role === 'agent' && (!ticket.assignedAgent || ticket.assignedAgent._id.toString() === req.user.id)) {
      updates.assignedAgent = req.user.id;
      if (ticket.status === 'new') updates.status = 'assigned';
    }
    if (takeTicket && req.user.role === 'admin' && !ticket.assignedAgent && ticket.status === 'new') {
      updates.status = 'assigned';
    }

    const updated = await Ticket.findByIdAndUpdate(ticket._id, { $set: updates }, { new: true })
      .populate('customer')
      .populate('assignedAgent');

    await addSystemMessage(
      updated,
      `AI triage reviewed by ${req.user.name}${takeTicket ? ` — ticket assigned to ${updated.assignedAgent?.name || 'an agent'}` : ''}: ${category} / ${priority} priority.`,
      req.app.get('io')
    );

    emitToTicket(req.app.get('io'), ticket._id.toString(), 'ticket:updated', {
      ticket: serializeTicket(updated),
      reason: 'review',
    });
    res.json({ ticket: serializeTicket(updated) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/assign — claim (agent) or assign (admin)
// ---------------------------------------------------------------------------
router.post(
  '/:id/assign',
  requireRole('agent', 'admin'),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: true });
    if (ticket.status === 'resolved') throw new HttpError(409, 'This ticket is resolved.');

    let agentId = req.user.id;
    let agentName = req.user.name;
    if (req.user.role === 'admin' && req.body?.agentId) {
      const agent = await User.findById(req.body.agentId);
      if (!agent || agent.role !== 'agent') throw new HttpError(400, 'Selected user is not an agent.');
      agentId = agent._id.toString();
      agentName = agent.name;
    }

    const updated = await Ticket.findByIdAndUpdate(
      ticket._id,
      { $set: { assignedAgent: agentId, status: 'assigned' } },
      { new: true }
    ).populate('customer').populate('assignedAgent');

    await addSystemMessage(updated, `${agentName} was assigned to this ticket.`, req.app.get('io'));
    emitToTicket(req.app.get('io'), ticket._id.toString(), 'ticket:updated', {
      ticket: serializeTicket(updated),
      reason: 'assigned',
    });
    res.json({ ticket: serializeTicket(updated) });
  })
);

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/status — workflow transitions (with rules)
// ---------------------------------------------------------------------------
router.patch(
  '/:id/status',
  requireRole('agent', 'admin'),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: false });
    const { status: nextStatus, resolutionNote } = req.body || {};

    if (!STATUSES.includes(nextStatus)) throw new HttpError(400, 'Invalid status.');
    if (ticket.status === 'resolved' && nextStatus !== 'resolved') {
      throw new HttpError(409, 'This ticket is resolved. Use the reopen action instead.');
    }
    if (ticket.status === nextStatus) throw new HttpError(400, `Ticket is already ${STATUS_LABELS[nextStatus]}.`);

    const updates = { status: nextStatus };

    if (nextStatus === 'resolved') {
      // Business rule: a ticket cannot be resolved without a resolution note
      if (!resolutionNote || String(resolutionNote).trim().length < 10) {
        throw new HttpError(400, 'A resolution note (min 10 characters) is required to resolve a ticket.', {
          resolutionNote: 'Please describe how the issue was resolved (min 10 characters).',
        });
      }
      if (ticket.status !== 'in_progress') {
        throw new HttpError(400, 'Only tickets In Progress can be resolved.');
      }
      updates.resolutionNote = String(resolutionNote).trim().slice(0, 2000);
      updates.resolvedAt = new Date();
    }

    if (nextStatus === 'in_progress' && !ticket.assignedAgent && req.user.role === 'agent') {
      updates.assignedAgent = req.user.id;
    }

    const updated = await Ticket.findByIdAndUpdate(ticket._id, { $set: updates }, { new: true })
      .populate('customer')
      .populate('assignedAgent');

    await addSystemMessage(
      updated,
      nextStatus === 'resolved'
        ? `Ticket resolved by ${req.user.name}: ${updates.resolutionNote}`
        : `Status changed to ${STATUS_LABELS[nextStatus]} by ${req.user.name}.`,
      req.app.get('io')
    );

    emitToTicket(req.app.get('io'), ticket._id.toString(), 'ticket:updated', {
      ticket: serializeTicket(updated),
      reason: 'status',
    });
    res.json({ ticket: serializeTicket(updated) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/reopen — reopen a resolved ticket
// ---------------------------------------------------------------------------
router.post(
  '/:id/reopen',
  asyncHandler(async (req, res) => {
    const { user } = req;
    const ticket = await loadTicketForViewer(req.params.id, user, { allowUnassignedAgent: false });
    if (ticket.status !== 'resolved') throw new HttpError(400, 'Only resolved tickets can be reopened.');

    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) throw new HttpError(400, 'Please provide a short reason for reopening (min 5 characters).');

    const updates = { status: 'in_progress', reopened: true, reopenedAt: new Date() };
    if (user.role === 'customer') updates.resolutionNote = ticket.resolutionNote; // preserved

    const updated = await Ticket.findByIdAndUpdate(ticket._id, { $set: updates }, { new: true })
      .populate('customer')
      .populate('assignedAgent');

    await addSystemMessage(updated, `Ticket reopened by ${user.name}: ${reason.slice(0, 300)}`, req.app.get('io'));
    emitToTicket(req.app.get('io'), ticket._id.toString(), 'ticket:updated', {
      ticket: serializeTicket(updated),
      reason: 'reopened',
    });
    res.json({ ticket: serializeTicket(updated) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/resolution-draft — AI-generated resolution summary (bonus)
// ---------------------------------------------------------------------------
router.post(
  '/:id/resolution-draft',
  requireRole('agent', 'admin'),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: false });
    const messages = await Message.find({ ticket: ticket._id }).sort({ createdAt: 1 }).limit(60);
    const draft = await generateJson(buildResolutionPrompt(ticket, messages));
    if (draft?.data?.resolutionSummary) {
      return res.json({
        resolutionSummary: String(draft.data.resolutionSummary).slice(0, 600),
        customerMessage: String(draft.data.customerMessage || '').slice(0, 400),
        provider: draft.provider,
      });
    }
    // Deterministic fallback draft from the conversation
    const lastAgentMessage = [...messages].reverse().find((m) => m.sender.role === 'agent');
    return res.json({
      resolutionSummary: `Based on the conversation, the reported "${ticket.category.toLowerCase()}" issue was addressed by our support team. ${
        lastAgentMessage ? `Final outcome: ${lastAgentMessage.content.slice(0, 200)}` : 'The agent confirmed the fix with the customer.'
      }`,
      customerMessage: 'Thank you for your patience — we are glad we could get this sorted for you.',
      provider: 'rules',
    });
  })
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/similar — duplicate/similar ticket detection (bonus)
// ---------------------------------------------------------------------------
router.get(
  '/:id/similar',
  asyncHandler(async (req, res) => {
    const ticket = await loadTicketForViewer(req.params.id, req.user, { allowUnassignedAgent: true });
    const candidates = await Ticket.find({
      _id: { $ne: ticket._id },
      status: { $ne: 'resolved' },
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) },
    })
      .populate('customer')
      .populate('assignedAgent')
      .limit(300);

    const source = `${ticket.subject} ${ticket.description}`;
    const similar = candidates
      .map((candidate) => ({
        ticket: serializeTicket(candidate),
        similarity: similarityScore(source, `${candidate.subject} ${candidate.description}`),
      }))
      .filter((row) => row.similarity >= 0.18)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    res.json({ similar });
  })
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/agents — list of agents (for admin reassignment)
// ---------------------------------------------------------------------------
router.get(
  '/meta/agents',
  requireRole('agent', 'admin'),
  asyncHandler(async (req, res) => {
    const agents = await User.find({ role: 'agent' }).select('name email expertise avatarColor');
    res.json({ agents: agents.map(serializeUserRef) });
  })
);

export default router;
