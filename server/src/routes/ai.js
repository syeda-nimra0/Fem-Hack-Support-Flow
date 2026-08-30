import { Router } from 'express';
import config from '../config.js';
import { requireAuth, asyncHandler } from '../auth.js';
import { generateText, providerStatus } from '../ai/provider.js';

const router = Router();

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter for the public chatbot
// ---------------------------------------------------------------------------
const buckets = new Map();
function rateLimit(key, limit = config.aiChatRateLimit, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 5000) buckets.clear(); // safety valve
  return bucket.count <= limit;
}

const SYSTEM_PROMPT = `You are "Flow", the AI support assistant of SupportFlow — an AI-assisted customer support desk.

Your job:
- Help visitors and customers understand how SupportFlow works (submitting tickets, AI triage, agent workflow, statuses).
- Answer common support questions (billing, account access, technical troubleshooting) with short, practical guidance.
- If a user reports a concrete problem, guide them to create a ticket in the app so a human agent can help.

Style: professional, warm, concise. Use short paragraphs or 2-4 bullet points. Never invent pricing, policies or account data. Keep every answer under 120 words.`;

// ---------------------------------------------------------------------------
// POST /api/ai/chat — chatbot proxy (key stays server-side)
// ---------------------------------------------------------------------------
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    if (!rateLimit(ip)) {
      return res.status(429).json({ error: 'Too many messages — please wait a moment and try again.' });
    }

    const history = Array.isArray(req.body?.messages) ? req.body.messages.slice(-10) : [];
    const valid = history.every(
      (m) =>
        m &&
        typeof m.content === 'string' &&
        ['user', 'assistant'].includes(m.role) &&
        m.content.length <= 2000
    );
    if (!valid || !history.length) {
      return res.status(400).json({ error: 'Invalid message history.' });
    }

    const transcript = history.map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`).join('\n');
    const result = await generateText(transcript, SYSTEM_PROMPT);

    if (result) {
      return res.json({ reply: result.text, provider: result.provider });
    }

    // Offline fallback so the assistant is never silent
    const last = history[history.length - 1].content.toLowerCase();
    let reply =
      "I'm having trouble reaching the AI service right now, but I can still help: you can submit a ticket from your dashboard (New Ticket) and a support agent will reply — AI triage will categorize and prioritize it automatically.";
    if (last.includes('ticket')) {
      reply =
        'To create a ticket: sign in, open your dashboard and click "New Ticket". Describe the issue in detail — our AI triage suggests a category, priority and summary, then an agent reviews it and replies right in the conversation.';
    } else if (last.includes('status') || last.includes('progress')) {
      reply =
        'Tickets move through four statuses: New → Assigned → In Progress → Resolved. You can follow every change in real time inside the ticket conversation.';
    }
    return res.json({ reply, provider: 'fallback' });
  })
);

// ---------------------------------------------------------------------------
// GET /api/ai/status — which providers are live (diagnostics, no secrets)
// ---------------------------------------------------------------------------
router.get('/status', (_req, res) => {
  res.json(providerStatus());
});

// ---------------------------------------------------------------------------
// POST /api/ai/triage-preview — public demo of the triage on the landing page
// ---------------------------------------------------------------------------
router.post(
  '/triage-preview',
  asyncHandler(async (req, res) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    if (!rateLimit(ip, 10)) {
      return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
    }
    const { subject, description } = req.body || {};
    if (!subject || !description || String(description).trim().length < 10) {
      return res.status(400).json({ error: 'Provide a subject and a description (min 10 characters).' });
    }
    const { runTriage } = await import('../ai/triage.js');
    const suggestion = await runTriage({ subject: String(subject), description: String(description) });
    res.json({ suggestion });
  })
);

export default router;
