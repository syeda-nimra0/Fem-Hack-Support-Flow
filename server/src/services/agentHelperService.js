import { config } from '../config/index.js';

/**
 * AI Agent Helper — Gemini-powered assistant for support agents.
 *
 * Provides:
 *   1. suggestReply()    — drafts a customer-facing reply based on ticket context
 *   2. draftResolution() — generates a concise resolution note for closing a ticket
 *   3. detectSimilar()   — finds semantically similar tickets (keyword-based fallback)
 *   4. summarizeThread() — summarizes a long conversation thread
 *
 * All Gemini calls have a 20s timeout and gracefully degrade to rule-based
 * fallbacks on any failure (per the hackathon spec).
 */

const HELP_SYSTEM_PROMPT = `You are an expert support agent assistant. You help human agents write clear, professional, and helpful responses to customers.

Guidelines for replies:
- Be polite, empathetic, and professional
- Acknowledge the customer's specific issue
- Provide actionable next steps or a clear explanation
- Keep it concise (3-5 sentences max)
- Don't make up facts — if you don't know, say the agent will investigate
- Don't include placeholders like [name] — use the customer's actual name if known
- Sign off professionally

Guidelines for resolution notes:
- One or two sentences
- State what was done and the outcome
- Use past tense ("Refund issued", "Bug fixed")`;

/**
 * Generate a draft reply for an agent to send to a customer.
 */
export async function suggestReply({ ticket, customerName }) {
  const conversation = (ticket.messages || [])
    .slice(-6)
    .map((m) => `${m.senderRole.toUpperCase()} (${m.senderName}): ${m.content}`)
    .join('\n');

  const prompt = `Draft a reply from a support agent to the customer for the following ticket.

Ticket Subject: ${ticket.subject}
Ticket Category: ${ticket.category}
Ticket Priority: ${ticket.priority}
Customer Name: ${customerName || 'the customer'}

Conversation so far:
${conversation}

Write ONLY the reply message (no subject, no greeting like "Dear customer" — start directly with the content). The reply should address the latest customer message and move the ticket toward resolution.`;

  return callGemini(prompt, { maxTokens: 400, temperature: 0.4 });
}

/**
 * Generate a draft resolution note for closing a ticket.
 */
export async function draftResolution({ ticket }) {
  const conversation = (ticket.messages || [])
    .slice(-8)
    .map((m) => `${m.senderRole.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `Write a concise resolution note for closing this support ticket. The note should summarize what was done and the outcome.

Ticket Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}

Conversation:
${conversation}

Write ONLY the resolution note (1-2 sentences, past tense, professional tone). Example: "Refund of $X issued to customer's original payment method. Customer acknowledged via chat."`;

  return callGemini(prompt, { maxTokens: 200, temperature: 0.3 });
}

/**
 * Summarize a long conversation thread.
 */
export async function summarizeThread({ ticket }) {
  const conversation = (ticket.messages || [])
    .map((m, i) => `${i + 1}. ${m.senderRole.toUpperCase()} (${m.senderName}, ${new Date(m.createdAt).toLocaleString()}): ${m.content}`)
    .join('\n');

  const prompt = `Summarize this support ticket conversation in 3-4 bullet points. Focus on:
- The customer's core issue
- What's been done so far
- What's pending / next steps
- Any blockers or risks

Ticket: ${ticket.subject}

Conversation:
${conversation}

Format: Just the bullet points, each starting with "•".`;

  return callGemini(prompt, { maxTokens: 300, temperature: 0.3 });
}

/**
 * Detect similar tickets — keyword-based similarity (no LLM needed).
 * Returns the top N most similar tickets from the provided list.
 */
export function detectSimilar(ticket, allTickets, limit = 3) {
  if (!ticket || !allTickets?.length) return [];

  const targetWords = new Set(extractKeywords(`${ticket.subject} ${ticket.description}`));
  if (targetWords.size === 0) return [];

  const scored = allTickets
    .filter((t) => t._id.toString() !== ticket._id.toString() && t.status !== 'resolved')
    .map((t) => {
      const words = new Set(extractKeywords(`${t.subject} ${t.description}`));
      let intersection = 0;
      for (const w of words) {
        if (targetWords.has(w)) intersection++;
      }
      const union = targetWords.size + words.size - intersection;
      const similarity = union > 0 ? intersection / union : 0;
      return { ticket: t, score: similarity };
    })
    .filter((x) => x.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function extractKeywords(text) {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'need', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'this', 'that', 'these', 'those', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
    'by', 'from', 'as', 'into', 'about', 'than', 'then', 'so', 'if', 'because',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'too', 'very', 'just', 'now', 'also', 'get', 'got', 'want', 'wanted', 'like',
    'please', 'help', 'issue', 'problem', 'ticket', 'order', 'account', 'email',
  ]);
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));
}

/**
 * Core Gemini call helper. Returns plain text response.
 */
async function callGemini(userPrompt, { maxTokens = 400, temperature = 0.4 } = {}) {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const endpoint = `${config.gemini.apiBase}/models/${config.gemini.model}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: HELP_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('Gemini returned no candidates');

    const parts = candidate.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('').trim();
    if (!text) {
      throw new Error(`Gemini returned empty content (finish: ${candidate.finishReason || 'unknown'})`);
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}
