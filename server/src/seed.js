/**
 * Seed — demo accounts + realistic sample tickets.
 * Runs automatically on first boot (empty database), or manually:
 *   bun run seed   (or: node src/seed.js)
 */
import bcrypt from 'bcryptjs';
import { User, Ticket, Message, Counter } from './models.js';

const DEMO_ACCOUNTS = {
  admin: { name: 'Sam Sullivan', email: 'admin@supportflow.io', password: 'Admin@123', avatarColor: '#3368A0' },
  agents: [
    { name: 'Alex Morgan', email: 'agent@supportflow.io', password: 'Agent@123', expertise: ['Billing', 'Account'], avatarColor: '#3368A0' },
    { name: 'Maya Chen', email: 'maya@supportflow.io', password: 'Agent@123', expertise: ['Technical', 'Product'], avatarColor: '#66A3BF' },
  ],
  customers: [
    { name: 'Sarah Williams', email: 'customer@supportflow.io', password: 'Demo@123', avatarColor: '#4E8D6E' },
    { name: 'Daniel Reyes', email: 'daniel@supportflow.io', password: 'Demo@123', avatarColor: '#B98A2F' },
    { name: 'Priya Nair', email: 'priya@supportflow.io', password: 'Demo@123', avatarColor: '#7A6AAE' },
  ],
};

/**
 * Seeds demo data using the CURRENT mongoose connection.
 * Idempotent + concurrency-safe (atomic lock via the Counter collection):
 * safe under simultaneous serverless cold starts — only one seeder wins.
 * Returns created users, or null when nothing was seeded.
 */
export async function seedData({ force = false } = {}) {
  const existing = await User.countDocuments();
  if (existing > 0 && !force) {
    return null;
  }

  // Atomic lock — the first caller wins; concurrent callers skip seeding.
  const lock = await Counter.findOneAndUpdate(
    { _id: 'seedLock' },
    { $setOnInsert: { seq: 1 } },
    { upsert: true, new: false }
  );
  if (lock && !force) {
    // Lock already existed — another process is seeding (or already did).
    return null;
  }

  if (force) {
    await Promise.all([User.deleteMany({}), Ticket.deleteMany({}), Message.deleteMany({}), Counter.deleteMany({ _id: { $ne: 'seedLock' } })]);
  }

  // Upsert by email so re-running never crashes on the unique index.
  const hash = (pw) => bcrypt.hash(pw, 10);
  const upsertUser = async (data, role) =>
    User.findOneAndUpdate(
      { email: data.email },
      { ...data, role, passwordHash: await hash(data.password) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

  const admin = await upsertUser(DEMO_ACCOUNTS.admin, 'admin');
  const agents = [];
  for (const agent of DEMO_ACCOUNTS.agents) {
    agents.push(await upsertUser(agent, 'agent'));
  }
  const customers = [];
  for (const customer of DEMO_ACCOUNTS.customers) {
    customers.push(await upsertUser(customer, 'customer'));
  }

  // Tickets are only created when the collection is still empty.
  if ((await Ticket.countDocuments()) > 0) {
    console.log('[seed] Tickets already present — users refreshed only.');
    return { admin, agents, customers };
  }

  const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);
  const createTicket = async (data) => {
    const seq = await Counter.findOneAndUpdate({ _id: 'ticketNumber' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return Ticket.create({ ticketNumber: `TKT-${String(seq.seq).padStart(4, '0')}`, ...data });
  };
  const sys = (ticket, content, at) =>
    Message.create({ ticket: ticket._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content, type: 'system', createdAt: at });

  // 1 — Resolved billing ticket with a complete conversation
  const t1 = await createTicket({
    subject: 'Charged twice for my monthly subscription',
    description:
      'I was charged twice for the same order this morning and need one payment refunded. I can see both charges on my card statement and this is the second time it happens.',
    customer: customers[0]._id,
    assignedAgent: agents[0]._id,
    category: 'Billing',
    priority: 'High',
    status: 'resolved',
    aiSuggestion: {
      category: 'Billing', priority: 'High',
      summary: 'Possible duplicate payment reported by customer.',
      suggestedResponse: "I'm sorry about the duplicate charge — I've issued a refund for the second payment, which should reach your card in 3-5 business days.",
      sentiment: 'Frustrated', provider: 'gemini', reviewed: true, reviewedBy: agents[0]._id, reviewedAt: hoursAgo(46),
    },
    resolutionNote: 'Duplicate charge confirmed — refund of $29.00 issued for the second transaction. Verified with payment provider.',
    resolutionSummary: 'Duplicate subscription charge confirmed with the payment provider; the second charge was refunded and the customer confirmed receipt.',
    resolvedAt: hoursAgo(40), lastMessageAt: hoursAgo(40), createdAt: hoursAgo(52), updatedAt: hoursAgo(40),
  });
  await Message.create([
    { ticket: t1._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content: 'Ticket TKT-0001 created — AI triage (gemini) suggests Billing / High priority, pending agent review.', type: 'system', createdAt: hoursAgo(52) },
    { ticket: t1._id, sender: { id: agents[0]._id, name: agents[0].name, role: 'agent' }, content: "Hi Sarah, I'm so sorry about the duplicate charge — I can see both transactions on your account. I've issued a refund for the second payment; it should reach your card in 3-5 business days.", type: 'message', createdAt: hoursAgo(50) },
    { ticket: t1._id, sender: { id: customers[0]._id, name: customers[0].name, role: 'customer' }, content: 'Thank you for the quick response! Could you also confirm the refund reference number for my records?', type: 'message', createdAt: hoursAgo(48) },
    { ticket: t1._id, sender: { id: agents[0]._id, name: agents[0].name, role: 'agent' }, content: 'Of course — the refund reference is RF-88213. Anything else I can help with?', type: 'message', createdAt: hoursAgo(41) },
    { ticket: t1._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content: 'Ticket resolved by Alex Morgan: Duplicate charge confirmed — refund of $29.00 issued for the second transaction. Verified with payment provider.', type: 'system', createdAt: hoursAgo(40) },
  ]);

  // 2 — In-progress technical ticket
  const t2 = await createTicket({
    subject: 'Dashboard charts not loading since yesterday',
    description:
      'Since the latest update the analytics dashboard keeps spinning and never renders the charts. I tried Chrome and Firefox, cleared the cache, still not working. This is blocking my weekly reporting.',
    customer: customers[1]._id,
    assignedAgent: agents[1]._id,
    category: 'Technical',
    priority: 'Medium',
    status: 'in_progress',
    aiSuggestion: {
      category: 'Technical', priority: 'Medium',
      summary: 'Analytics dashboard fails to render charts after latest update, blocking weekly reporting.',
      suggestedResponse: "Thanks for the detailed report — could you share your browser console output so we can pin it down faster?",
      sentiment: 'Neutral', provider: 'gemini', reviewed: true, reviewedBy: agents[1]._id, reviewedAt: hoursAgo(20),
    },
    lastMessageAt: hoursAgo(4), createdAt: hoursAgo(26), updatedAt: hoursAgo(4),
  });
  await Message.create([
    { ticket: t2._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content: 'AI triage reviewed by Maya Chen — ticket assigned to Maya Chen: Technical / Medium priority.', type: 'system', createdAt: hoursAgo(20) },
    { ticket: t2._id, sender: { id: agents[1]._id, name: agents[1].name, role: 'agent' }, content: "Hi Daniel, thanks for the detailed report — this looks related to yesterday's release. Could you share your browser console output (View → Developer → Console)?", type: 'message', createdAt: hoursAgo(19) },
    { ticket: t2._id, sender: { id: customers[1]._id, name: customers[1].name, role: 'customer' }, content: "Sure, the console shows \"Uncaught TypeError: Cannot read properties of undefined (reading 'dataset')\" repeated many times.", type: 'message', createdAt: hoursAgo(6) },
    { ticket: t2._id, sender: { id: agents[1]._id, name: agents[1].name, role: 'agent' }, content: 'That confirms it — our engineers have identified the regression and a patch is rolling out tonight. I will keep you posted here.', type: 'message', createdAt: hoursAgo(4) },
  ]);

  // 3 — New ticket awaiting agent review of the AI suggestion
  const t3 = await createTicket({
    subject: 'Cannot reset my password — email never arrives',
    description:
      'I forgot my password and requested a reset link four times but no email arrives, not even in spam. I am locked out of my account and I need access urgently for a client presentation tomorrow.',
    customer: customers[2]._id,
    category: 'General',
    priority: 'Medium',
    status: 'new',
    aiSuggestion: {
      category: 'Account', priority: 'High',
      summary: 'Customer locked out — password reset emails not delivered after four attempts.',
      suggestedResponse: "I'm sorry you're locked out. Let me verify your account's email delivery settings and send a manual reset link right away.",
      sentiment: 'Frustrated', provider: 'gemini', reviewed: false,
    },
    lastMessageAt: hoursAgo(2), createdAt: hoursAgo(2), updatedAt: hoursAgo(2),
  });
  await sys(t3, 'Ticket TKT-0003 created — AI triage (gemini) suggests Account / High priority, pending agent review.', hoursAgo(2));

  // 4 — New unassigned product question
  const t4 = await createTicket({
    subject: 'Question about upgrading to the Team plan',
    description:
      'My team is growing and I would like to know how the upgrade to the Team plan works: do you prorate the current billing cycle? Can we add seats mid-month?',
    customer: customers[0]._id,
    category: 'General',
    priority: 'Low',
    status: 'new',
    aiSuggestion: {
      category: 'Product', priority: 'Low',
      summary: 'Pre-sales question about Team plan upgrade, proration and mid-month seat additions.',
      suggestedResponse: 'Great to hear your team is growing! Upgrades are prorated automatically and you can add seats at any time.',
      sentiment: 'Positive', provider: 'gemini', reviewed: false,
    },
    lastMessageAt: hoursAgo(9), createdAt: hoursAgo(9), updatedAt: hoursAgo(9),
  });
  await sys(t4, 'Ticket TKT-0004 created — AI triage (gemini) suggests Product / Low priority, pending agent review.', hoursAgo(9));

  // 5 — Resolved shipping ticket
  const t5 = await createTicket({
    subject: 'Package marked delivered but not received',
    description:
      'Order ORD-77120 shows as delivered on Tuesday but nothing arrived at my address. The tracking says it was left at the front desk but we do not have a front desk.',
    customer: customers[1]._id,
    assignedAgent: agents[0]._id,
    category: 'Shipping',
    priority: 'High',
    status: 'resolved',
    aiSuggestion: {
      category: 'Shipping', priority: 'High',
      summary: 'Package marked delivered but not received; address may be mismatched.',
      suggestedResponse: "I'm sorry about the missing package. I've opened a courier investigation and prepared a replacement shipment.",
      sentiment: 'Frustrated', provider: 'rules', reviewed: true, reviewedBy: agents[0]._id, reviewedAt: hoursAgo(70),
    },
    resolutionNote: 'Courier misdelivery confirmed — replacement dispatched with signature requirement and address note updated.',
    resolutionSummary: 'Courier investigation confirmed a misdelivery; a replacement order was dispatched with signature on delivery.',
    resolvedAt: hoursAgo(64), lastMessageAt: hoursAgo(64), createdAt: hoursAgo(78), updatedAt: hoursAgo(64),
  });
  await Message.create([
    { ticket: t5._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content: 'Ticket TKT-0005 created — AI triage (rules) suggests Shipping / High priority, pending agent review.', type: 'system', createdAt: hoursAgo(78) },
    { ticket: t5._id, sender: { id: agents[0]._id, name: agents[0].name, role: 'agent' }, content: "Hi Daniel, I'm sorry about the missing package. I've opened a courier investigation and prepared a replacement shipment with signature on delivery.", type: 'message', createdAt: hoursAgo(74) },
    { ticket: t5._id, sender: { id: customers[1]._id, name: customers[1].name, role: 'customer' }, content: 'Replacement received today — thank you for sorting this out quickly!', type: 'message', createdAt: hoursAgo(64) },
    { ticket: t5._id, sender: { id: null, name: 'SupportFlow', role: 'system' }, content: 'Ticket resolved by Alex Morgan: Courier misdelivery confirmed — replacement dispatched with signature requirement and address note updated.', type: 'system', createdAt: hoursAgo(64) },
  ]);

  console.log('[seed] Demo accounts + 5 sample tickets created.');
  console.log('[seed] Credentials — customer@supportflow.io/Demo@123 · agent@supportflow.io/Agent@123 · maya@supportflow.io/Agent@123 · admin@supportflow.io/Admin@123');
  return { admin, agents, customers };
}

// ---------------------------------------------------------------------------
// Standalone runner: node src/seed.js [--force]
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const { initDatabase, closeDatabase } = await import('./db.js');
  try {
    await initDatabase();
    const result = await seedData({ force: process.argv.includes('--force') });
    if (!result) console.log('[seed] Users already present — nothing to do (use --force to reseed).');
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err);
    process.exit(1);
  }
}
