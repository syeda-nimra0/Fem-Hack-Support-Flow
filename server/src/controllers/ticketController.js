import { nanoid } from 'nanoid';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { triageTicket, CATEGORIES, PRIORITIES, STATUSES } from '../services/triageService.js';
import { suggestReply, draftResolution, summarizeThread, detectSimilar } from '../services/agentHelperService.js';
import { asyncHandler } from '../middleware/error.js';
import { getIO } from '../socket/index.js';

function formatTicketNumber() {
  return `SF-${nanoid(8).toUpperCase()}`;
}

function publicTicket(ticket) {
  const t = ticket.toObject ? ticket.toObject() : ticket;
  return t;
}

/**
 * Create a new ticket and run AI triage.
 * Returns the ticket with the AI suggestion embedded (NOT yet saved to category/priority -
 * the agent must review the AI suggestion first, then it gets finalized).
 */
export const createTicket = asyncHandler(async (req, res) => {
  const { subject, description, category } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ message: 'Subject and description are required.' });
  }

  // Run AI triage
  let aiSuggestion = null;
  let triageError = null;
  try {
    aiSuggestion = await triageTicket(subject, description);
  } catch (err) {
    triageError = err.message;
  }

  // Pre-fill category/priority from AI suggestion so customer sees something,
  // but mark aiReviewed=false so the agent knows to confirm/edit.
  const initialCategory = category && CATEGORIES.includes(category) ? category : (aiSuggestion?.category || 'general');
  const initialPriority = aiSuggestion?.priority || 'medium';

  const ticket = await Ticket.create({
    ticketNumber: formatTicketNumber(),
    subject: subject.trim(),
    description: description.trim(),
    customer: req.userId,
    customerName: req.user.name,
    category: initialCategory,
    priority: initialPriority,
    aiSuggestion,
    aiReviewed: false,
    messages: [
      {
        sender: req.userId,
        senderRole: 'customer',
        senderName: req.user.name,
        content: description.trim(),
        isInternal: false,
      },
    ],
  });

  // Notify any connected agents/admins about the new ticket
  const io = getIO();
  if (io) {
    io.to('role:agent').to('role:admin').emit('ticket:new', {
      ticket: publicTicket(await ticket.populate('customer', 'name email avatarColor')),
    });
    io.to(`user:${req.userId}`).emit('ticket:created', { ticket: publicTicket(ticket) });
  }

  res.status(201).json({
    message: triageError
      ? 'Ticket created, but AI triage was unavailable. An agent will review manually.'
      : 'Ticket created and analyzed by AI.',
    ticket: publicTicket(await ticket.populate('customer', 'name email avatarColor')),
    triageError,
  });
});

/**
 * Get tickets - role scoped:
 *  - customer: only their own tickets
 *  - agent: tickets assigned to them + unassigned new tickets
 *  - admin: all tickets
 */
export const getTickets = asyncHandler(async (req, res) => {
  const { status, priority, category, search } = req.query;
  const filter = {};

  if (req.user.role === 'customer') {
    filter.customer = req.userId;
  } else if (req.user.role === 'agent') {
    filter.$or = [
      { assignedAgent: req.userId },
      { assignedAgent: null, status: 'new' },
    ];
  }
  // admin sees all

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { subject: rx },
          { ticketNumber: rx },
          { description: rx },
          { customerName: rx },
        ],
      },
    ];
  }

  const tickets = await Ticket.find(filter)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ tickets });
});

export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor')
    .populate('messages.sender', 'name email avatarColor');

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  // Authorization:
  // - customer can only view their own tickets
  // - agent can view tickets assigned to them OR unassigned new tickets
  // - admin can view any
  if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.userId) {
    return res.status(403).json({ message: 'You do not have access to this ticket.' });
  }
  if (req.user.role === 'agent') {
    const isAssignedToMe = ticket.assignedAgent?._id?.toString() === req.userId;
    const isUnassignedNew = !ticket.assignedAgent && ticket.status === 'new';
    if (!isAssignedToMe && !isUnassignedNew) {
      return res.status(403).json({ message: 'This ticket is assigned to another agent.' });
    }
  }

  res.json({ ticket: publicTicket(ticket) });
});

/**
 * Agent reviews/edits the AI suggestion and assigns the ticket to themselves.
 * Body: { category, priority, summary, assignToMe }
 */
export const reviewTriage = asyncHandler(async (req, res) => {
  const { category, priority, summary, assignToMe } = req.body;

  if (!category || !priority || !summary) {
    return res.status(400).json({ message: 'category, priority, and summary are required.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ message: 'Invalid category.' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ message: 'Invalid priority.' });
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (req.user.role === 'agent' && ticket.assignedAgent && ticket.assignedAgent.toString() !== req.userId) {
    return res.status(403).json({ message: 'This ticket is assigned to another agent.' });
  }
  if (ticket.status === 'resolved') {
    return res.status(400).json({ message: 'Cannot review a resolved ticket.' });
  }

  // Update the AI suggestion (preserve original in audit log if changed)
  if (ticket.aiSuggestion) {
    ticket.aiSuggestion.category = category;
    ticket.aiSuggestion.priority = priority;
    ticket.aiSuggestion.summary = summary;
  } else {
    ticket.aiSuggestion = {
      category,
      priority,
      summary,
      confidence: 1,
      source: 'manual',
    };
  }
  ticket.aiReviewed = true;
  ticket.category = category;
  ticket.priority = priority;

  if (assignToMe && !ticket.assignedAgent) {
    ticket.assignedAgent = req.userId;
    ticket.assignedAgentName = req.user.name;
    ticket.status = 'assigned';
  }

  await ticket.save();

  const populated = await Ticket.findById(ticket._id)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor');

  const io = getIO();
  if (io) {
    io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket: publicTicket(populated) });
    io.to(`user:${ticket.customer.toString()}`).emit('ticket:updated', {
      ticket: publicTicket(populated),
    });
    io.to('role:admin').emit('ticket:updated', { ticket: publicTicket(populated) });
  }

  res.json({ message: 'AI suggestion reviewed and saved.', ticket: publicTicket(populated) });
});

/**
 * Agent assigns ticket to themselves (without changing AI suggestion).
 */
export const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only agents can assign tickets.' });
  }
  if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.userId && req.user.role === 'agent') {
    return res.status(403).json({ message: 'Ticket is already assigned to another agent.' });
  }

  ticket.assignedAgent = req.userId;
  ticket.assignedAgentName = req.user.name;
  if (ticket.status === 'new') ticket.status = 'assigned';

  await ticket.save();

  const populated = await Ticket.findById(ticket._id)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor');

  const io = getIO();
  if (io) {
    io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket: publicTicket(populated) });
    io.to(`user:${ticket.customer.toString()}`).emit('ticket:updated', { ticket: publicTicket(populated) });
  }

  res.json({ message: 'Ticket assigned.', ticket: publicTicket(populated) });
});

/**
 * Update ticket status. Resolving requires a resolution note.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  if (req.user.role === 'customer') {
    return res.status(403).json({ message: 'Customers cannot change ticket status.' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent?.toString() !== req.userId) {
    return res.status(403).json({ message: 'Only the assigned agent can change ticket status.' });
  }
  if (ticket.status === 'resolved' && status !== 'resolved') {
    // Re-open is allowed but requires a message (resolution stays)
    // For simplicity, we allow re-open by changing status only
  }
  if (status === 'resolved' && !resolution) {
    return res.status(400).json({ message: 'A resolution note is required to mark a ticket as resolved.' });
  }
  if (status === 'resolved') {
    ticket.resolution = resolution;
    ticket.resolvedAt = new Date();
  } else {
    ticket.resolvedAt = null;
  }

  ticket.status = status;
  await ticket.save();

  // Add a system message about the status change
  if (status === 'resolved') {
    ticket.messages.push({
      sender: req.userId,
      senderRole: 'system',
      senderName: 'System',
      content: `Ticket resolved. Resolution: ${resolution}`,
      isInternal: false,
    });
    await ticket.save();
  } else if (status === 'in_progress' && ticket.messages.length && ticket.messages[ticket.messages.length - 1].senderRole === 'system') {
    // skip - already a system message
  } else {
    ticket.messages.push({
      sender: req.userId,
      senderRole: 'system',
      senderName: 'System',
      content: `Status changed to "${status}".`,
      isInternal: false,
    });
    await ticket.save();
  }

  const populated = await Ticket.findById(ticket._id)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor')
    .populate('messages.sender', 'name email avatarColor');

  const io = getIO();
  if (io) {
    io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket: publicTicket(populated) });
    io.to(`user:${ticket.customer.toString()}`).emit('ticket:updated', { ticket: publicTicket(populated) });
    io.to('role:admin').emit('ticket:updated', { ticket: publicTicket(populated) });
  }

  res.json({ message: 'Status updated.', ticket: publicTicket(populated) });
});

/**
 * Add a message to a ticket conversation.
 */
export const addMessage = asyncHandler(async (req, res) => {
  const { content, isInternal } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  if (req.user.role === 'customer' && ticket.customer.toString() !== req.userId) {
    return res.status(403).json({ message: 'You do not have access to this ticket.' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent?.toString() !== req.userId) {
    return res.status(403).json({ message: 'Only the assigned agent can reply.' });
  }
  if (ticket.status === 'resolved') {
    return res.status(400).json({ message: 'This ticket is resolved. Reopen it to continue the conversation.' });
  }

  const message = {
    sender: req.userId,
    senderRole: req.user.role,
    senderName: req.user.name,
    content: content.trim(),
    isInternal: isInternal === true && req.user.role === 'agent',
  };

  ticket.messages.push(message);

  // Auto-move to in_progress if agent replies and was assigned
  if (req.user.role === 'agent' && ticket.status === 'assigned') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  const populated = await Ticket.findById(ticket._id)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name email avatarColor')
    .populate('messages.sender', 'name email avatarColor');

  const io = getIO();
  if (io) {
    const newMsg = populated.messages[populated.messages.length - 1];
    io.to(`ticket:${ticket._id}`).emit('ticket:message', {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      message: newMsg,
    });
    io.to(`ticket:${ticket._id}`).emit('ticket:updated', { ticket: publicTicket(populated) });
    io.to(`user:${ticket.customer.toString()}`).emit('ticket:updated', { ticket: publicTicket(populated) });
  }

  res.status(201).json({ message: 'Message sent.', ticket: publicTicket(populated) });
});

/**
 * Typing indicator (real-time only - no persistence).
 */
export const setTyping = asyncHandler(async (req, res) => {
  const { isTyping } = req.body;
  const ticket = await Ticket.findById(req.params.id).select('customer assignedAgent');
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  if (req.user.role === 'customer' && ticket.customer.toString() !== req.userId) {
    return res.status(403).json({ message: 'No access.' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent?.toString() !== req.userId) {
    return res.status(403).json({ message: 'No access.' });
  }

  const io = getIO();
  if (io) {
    io.to(`ticket:${ticket._id}`).emit('ticket:typing', {
      ticketId: ticket._id.toString(),
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      isTyping: !!isTyping,
    });
  }

  res.json({ ok: true });
});

/**
 * Re-run AI triage on an existing ticket (agent action).
 */
export const rerunTriage = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only agents can re-run triage.' });
  }

  let aiSuggestion;
  let triageError = null;
  try {
    aiSuggestion = await triageTicket(ticket.subject, ticket.description);
  } catch (err) {
    triageError = err.message;
    return res.status(502).json({ message: 'AI triage failed.', error: triageError });
  }

  ticket.aiSuggestion = aiSuggestion;
  ticket.aiReviewed = false;
  // Don't auto-overwrite category/priority - let agent review
  await ticket.save();

  res.json({ message: 'AI triage re-run.', aiSuggestion });
});

/**
 * Dashboard statistics based on actual ticket data.
 */
export const getStats = asyncHandler(async (req, res) => {
  // Customers see their own stats, agents/admins see global stats
  const matchStage = req.user.role === 'customer' ? { customer: req.user._id } : {};

  const [byStatus, byPriority, byCategory, totals, recentResolved] = await Promise.all([
    Ticket.aggregate([{ $match: matchStage }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: matchStage }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: matchStage }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Ticket.countDocuments(matchStage),
    Ticket.countDocuments({ ...matchStage, status: 'resolved' }),
  ]);

  // Avg resolution time (hours)
  const resolvedWithTimes = await Ticket.find({
    ...matchStage,
    status: 'resolved',
    resolvedAt: { $ne: null },
  }).select('createdAt resolvedAt');
  const avgResolutionHours =
    resolvedWithTimes.length > 0
      ? resolvedWithTimes.reduce((sum, t) => {
          const hrs = (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3600000;
          return sum + hrs;
        }, 0) / resolvedWithTimes.length
      : 0;

  res.json({
    totals: { all: totals, resolved: recentResolved, open: totals - recentResolved },
    byStatus: byStatus.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {}),
    byPriority: byPriority.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {}),
    byCategory: byCategory.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {}),
    avgResolutionHours: Number(avgResolutionHours.toFixed(2)),
    agentCount: await User.countDocuments({ role: 'agent', isActive: true }),
    customerCount: await User.countDocuments({ role: 'customer', isActive: true }),
  });
});

/**
 * AI Agent Helper — suggest a reply for the agent to send.
 */
export const aiSuggestReply = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('assignedAgent', 'name email');

  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.userId) {
    return res.status(403).json({ message: 'No access.' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent?._id?.toString() !== req.userId) {
    return res.status(403).json({ message: 'Only the assigned agent can use the AI helper.' });
  }

  try {
    const suggestion = await suggestReply({
      ticket,
      customerName: ticket.customer?.name,
    });
    res.json({ suggestion });
  } catch (err) {
    console.warn('[agent-helper] suggestReply failed:', err.message);
    res.status(503).json({
      message: 'AI suggestion unavailable right now. Please write a reply manually.',
      error: err.message,
    });
  }
});

/**
 * AI Agent Helper — draft a resolution note.
 */
export const aiDraftResolution = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('customer', 'name email');

  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only agents can draft resolutions.' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent?.toString() !== req.userId) {
    return res.status(403).json({ message: 'Only the assigned agent can draft resolutions.' });
  }

  try {
    const draft = await draftResolution({ ticket });
    res.json({ draft });
  } catch (err) {
    console.warn('[agent-helper] draftResolution failed:', err.message);
    res.status(503).json({
      message: 'AI draft unavailable right now. Please write a resolution note manually.',
      error: err.message,
    });
  }
});

/**
 * AI Agent Helper — summarize the conversation thread.
 */
export const aiSummarizeThread = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('customer', 'name email');

  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
  if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.userId) {
    return res.status(403).json({ message: 'No access.' });
  }

  try {
    const summary = await summarizeThread({ ticket });
    res.json({ summary });
  } catch (err) {
    console.warn('[agent-helper] summarizeThread failed:', err.message);
    res.status(503).json({
      message: 'AI summary unavailable right now.',
      error: err.message,
    });
  }
});

/**
 * Find similar tickets (keyword-based — no LLM call needed).
 */
export const findSimilarTickets = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  if (req.user.role === 'customer' && ticket.customer.toString() !== req.userId) {
    return res.status(403).json({ message: 'No access.' });
  }

  // Get candidate tickets (same category, or all if customer)
  const filter = { _id: { $ne: ticket._id } };
  if (req.user.role === 'customer') filter.customer = req.userId;
  if (req.user.role === 'agent') {
    filter.$or = [
      { assignedAgent: req.userId },
      { assignedAgent: null, status: 'new' },
    ];
  }

  const candidates = await Ticket.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('customer', 'name email avatarColor')
    .populate('assignedAgent', 'name')
    .lean();

  const similar = detectSimilar(ticket, candidates, 3);
  res.json({
    similar: similar.map((s) => ({
      ticket: s.ticket,
      score: Number(s.score.toFixed(2)),
    })),
  });
});

/**
 * Get recent activity feed (for dashboards).
 */
export const getActivityFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 30);

  // For customers: only their own activity
  // For agents/admins: all activity
  const matchStage = req.user.role === 'customer' ? { customer: req.user._id } : {};

  const recent = await Ticket.find(matchStage)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('customer', 'name avatarColor')
    .populate('assignedAgent', 'name')
    .select('ticketNumber subject status priority category updatedAt createdAt customer assignedAgent resolvedAt')
    .lean();

  const activities = recent.map((t) => {
    let action = 'created';
    let time = t.createdAt;
    if (t.status === 'resolved' && t.resolvedAt) {
      action = 'resolved';
      time = t.resolvedAt;
    } else if (t.updatedAt > t.createdAt) {
      action = 'updated';
      time = t.updatedAt;
    }
    return {
      _id: t._id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
      action,
      time,
      customer: t.customer,
      assignedAgent: t.assignedAgent,
    };
  });

  res.json({ activities });
});

