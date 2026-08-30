import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES } from './config.js';

const { ObjectId } = mongoose.Schema.Types;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer', index: true },
    // Category expertise used by the auto-assignment bonus feature
    expertise: { type: [String], default: () => [] },
    avatarColor: { type: String, default: '#3368A0' },
    // Profile details (editable from Profile Settings)
    phone: { type: String, default: '', trim: true, maxlength: 24 },
    company: { type: String, default: '', trim: true, maxlength: 60 },
    location: { type: String, default: '', trim: true, maxlength: 60 },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    expertise: this.expertise,
    avatarColor: this.avatarColor,
    phone: this.phone || '',
    company: this.company || '',
    location: this.location || '',
    bio: this.bio || '',
    createdAt: this.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
const aiSuggestionSchema = new mongoose.Schema(
  {
    category: { type: String, enum: [...CATEGORIES, null], default: null },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },
    summary: { type: String, default: '' },
    suggestedResponse: { type: String, default: '' },
    sentiment: { type: String, default: '' },
    provider: { type: String, default: '' }, // gemini | glm | rules
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, index: true },
    subject: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    customer: { type: ObjectId, ref: 'User', required: true, index: true },
    assignedAgent: { type: ObjectId, ref: 'User', default: null, index: true },
    category: { type: String, enum: CATEGORIES, default: 'General', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    aiSuggestion: { type: aiSuggestionSchema, default: () => ({}) },
    resolutionNote: { type: String, default: '' },
    resolutionSummary: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    reopened: { type: Boolean, default: false },
    reopenedAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, priority: -1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Messages (ticket conversation — persisted history)
// ---------------------------------------------------------------------------
const messageSchema = new mongoose.Schema(
  {
    ticket: { type: ObjectId, ref: 'Ticket', required: true, index: true },
    sender: {
      id: { type: ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, enum: ['customer', 'agent', 'admin', 'system'], required: true },
    },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    type: { type: String, enum: ['message', 'system', 'note'], default: 'message', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ---------------------------------------------------------------------------
// Counters (atomic ticket numbers)
// ---------------------------------------------------------------------------
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const User = mongoose.model('User', userSchema);
export const Ticket = mongoose.model('Ticket', ticketSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextTicketNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticketNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `TKT-${String(counter.seq).padStart(4, '0')}`;
}

/**
 * Serialize a ticket for API responses. `viewer` controls visibility of
 * internal-only fields (agent notes etc. are handled at message level).
 */
export function serializeTicket(ticket, { includeCustomer = true } = {}) {
  if (!ticket) return null;
  const t = ticket.toObject ? ticket.toObject() : ticket;
  return {
    id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    customer: includeCustomer && t.customer ? serializeUserRef(t.customer) : null,
    assignedAgent: t.assignedAgent ? serializeUserRef(t.assignedAgent) : null,
    category: t.category,
    priority: t.priority,
    status: t.status,
    aiSuggestion: t.aiSuggestion || null,
    resolutionNote: t.resolutionNote,
    resolutionSummary: t.resolutionSummary,
    resolvedAt: t.resolvedAt,
    reopened: t.reopened,
    reopenedAt: t.reopenedAt,
    lastMessageAt: t.lastMessageAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function serializeUserRef(user) {
  if (!user) return null;
  if (user.toObject) {
    return {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      email: user.email,
      expertise: user.expertise,
    };
  }
  return {
    id: (user._id || user.id).toString(),
    name: user.name,
    role: user.role,
    avatarColor: user.avatarColor,
    expertise: user.expertise || [],
  };
}

export function serializeMessage(message) {
  const m = message.toObject ? message.toObject() : message;
  return {
    id: m._id.toString(),
    ticket: m.ticket ? m.ticket.toString() : undefined,
    sender: m.sender,
    content: m.content,
    type: m.type,
    createdAt: m.createdAt,
  };
}
