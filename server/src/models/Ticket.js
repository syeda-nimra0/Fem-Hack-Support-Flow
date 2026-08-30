import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'agent', 'system'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const aiSuggestionSchema = new Schema(
  {
    category: {
      type: String,
      enum: ['billing', 'technical', 'shipping', 'account', 'product', 'general'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    source: {
      type: String,
      enum: ['rule-based', 'openai'],
      default: 'rule-based',
    },
  },
  { _id: false }
);

const ticketSchema = new Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: 5,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAgentName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'resolved'],
      default: 'new',
      index: true,
    },
    category: {
      type: String,
      enum: ['billing', 'technical', 'shipping', 'account', 'product', 'general'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    // The original AI suggestion (before any human edit)
    aiSuggestion: {
      type: aiSuggestionSchema,
      default: null,
    },
    // Whether an agent has reviewed/edited the AI suggestion
    aiReviewed: {
      type: Boolean,
      default: false,
    },
    // Final category/priority stored at top level for query convenience
    resolution: {
      type: String,
      trim: true,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

ticketSchema.methods.canBeModified = function canBeModified() {
  return this.status !== 'resolved';
};

ticketSchema.methods.addMessage = function addMessage({ sender, senderRole, senderName, content, isInternal = false }) {
  this.messages.push({ sender, senderRole, senderName, content, isInternal });
  return this;
};

ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ customer: 1, createdAt: -1 });
ticketSchema.index({ assignedAgent: 1, status: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
