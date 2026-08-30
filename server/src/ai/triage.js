import { CATEGORIES, PRIORITIES } from '../config.js';
import { generateJson } from './provider.js';

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
export function buildTriagePrompt({ subject, description, customerCategory }) {
  return `You are the AI triage engine of "SupportFlow", a professional customer support desk.

Analyze the following support ticket and classify it.

Ticket subject: "${subject}"
Ticket description: "${description}"
${customerCategory ? `Customer-selected category (may be wrong): "${customerCategory}"` : ''}

Respond with ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "priority": one of ${JSON.stringify(PRIORITIES)},
  "summary": "a neutral one-sentence summary of the issue, max 140 characters",
  "suggestedResponse": "a professional, empathetic first-reply draft to the customer, 2-3 sentences, max 320 characters",
  "sentiment": one of ["Positive", "Neutral", "Frustrated", "Angry"]
}

Guidance:
- Billing: payments, charges, refunds, invoices, subscriptions, pricing disputes.
- Technical: errors, bugs, crashes, broken features, performance, integrations.
- Account: login problems, password resets, access, profile or email changes.
- Shipping: delivery, tracking, lost or late packages, address changes.
- Product: how-to questions, feature requests, product behavior clarifications.
- General: anything that does not fit the above.
- Priority High: service down, money lost, security concerns, very frustrated or urgent wording.
- Priority Medium: real impairment but with a workaround.
- Priority Low: questions, minor issues, feature requests.`;
}

export function buildResolutionPrompt(ticket, messages) {
  const transcript = messages
    .filter((m) => m.type !== 'note')
    .map((m) => `${m.sender.name} (${m.sender.role}): ${m.content}`)
    .join('\n');
  return `You are the AI assistant of "SupportFlow", a customer support desk.

Write a concise resolution summary for the following resolved ticket. The support agent will review and edit it before saving.

Ticket ${ticket.ticketNumber}: "${ticket.subject}"
Category: ${ticket.category} | Priority: ${ticket.priority}
Conversation transcript:
${transcript || '(no messages)'}

Respond with ONLY a valid JSON object: { "resolutionSummary": "2-3 sentence summary of the root cause and how it was resolved, max 400 characters", "customerMessage": "a short closing message thanking the customer, max 200 characters" }`;
}

// ---------------------------------------------------------------------------
// Output validation (AI output must be validated before being stored)
// ---------------------------------------------------------------------------
const SENTIMENTS = ['Positive', 'Neutral', 'Frustrated', 'Angry'];

export function validateTriage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const category = CATEGORIES.includes(raw.category) ? raw.category : null;
  const priority = PRIORITIES.includes(raw.priority) ? raw.priority : null;
  const summary =
    typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim().slice(0, 300)
      : null;
  const suggestedResponse =
    typeof raw.suggestedResponse === 'string' && raw.suggestedResponse.trim()
      ? raw.suggestedResponse.trim().slice(0, 600)
      : '';
  const sentiment = SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : 'Neutral';
  if (!category || !priority || !summary) return null;
  return { category, priority, summary, suggestedResponse, sentiment };
}

// ---------------------------------------------------------------------------
// Rules engine — deterministic triage used when both AI providers fail
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(
  'a an the and or but if then else for to of in on at by with from as is are was were be been being i me my we our you your he she it they them this that these those have has had do does did not no so very can cannot will would should could just about into over under again more most some any what which who whom when where why how all each every both few other such only own same than too s t don now'.split(
    /\s+/
  )
);

const CATEGORY_RULES = [
  ['Billing', ['charg', 'refund', 'invoice', 'payment', 'billed', 'billing', 'subscription', 'price', 'pricing', 'fee', 'double', 'money', 'card', 'receipt', 'coupon', 'discount', 'vat', 'tax']],
  ['Technical', ['error', 'bug', 'crash', 'not working', 'fails', 'failed', 'broken', 'issue with the app', 'slow', 'loading', 'spinning', '500', '404', 'api', 'integration', 'sync', 'glitch', 'freeze', 'frozen', 'white screen', 'logs']],
  ['Account', ['password', 'login', 'log in', 'sign in', 'account', 'access', 'profile', 'email change', '2fa', 'verification', 'locked out', 'reset', 'username']],
  ['Shipping', ['shipping', 'delivery', 'deliver', 'track', 'tracking', 'package', 'parcel', 'courier', 'arrived', 'late', 'lost package', 'address', 'dispatch', 'order status']],
  ['Product', ['how to', 'feature', 'question', 'usage', 'upgrade', 'downgrade', 'plan', 'documentation', 'tutorial', 'possible to', 'can i', 'request']],
];

const HIGH_PRIORITY_RULES = ['urgent', 'asap', 'immediately', 'unacceptable', 'angry', 'furious', 'fraud', 'scam', 'security', 'breach', 'outage', 'down', 'cannot access at all', 'blocked', 'charged twice', 'double charg', 'lost money', 'legal', 'cancel my account immediately', 'escalate'];
const LOW_PRIORITY_RULES = ['how to', 'question', 'wondering', 'curious', 'feature request', 'suggestion', 'documentation', 'when will', 'roadmap'];

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function ruleCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'General';
}

function rulePriority(text) {
  const lower = text.toLowerCase();
  if (HIGH_PRIORITY_RULES.some((kw) => lower.includes(kw))) return 'High';
  if (LOW_PRIORITY_RULES.some((kw) => lower.includes(kw))) return 'Low';
  return 'Medium';
}

function ruleSentiment(text) {
  const lower = text.toLowerCase();
  const angry = ['unacceptable', 'angry', 'furious', 'ridiculous', 'worst', 'scam', 'fraud'];
  const frustrated = ['frustrat', 'again', 'still', 'nobody', 'waiting', 'third time', 'no response', 'disappointed'];
  if (angry.some((kw) => lower.includes(kw))) return 'Angry';
  if (frustrated.some((kw) => lower.includes(kw))) return 'Frustrated';
  return 'Neutral';
}

export function rulesTriage({ subject, description, customerCategory }) {
  const text = `${subject} ${description}`;
  const category = ruleCategory(text) || customerCategory || 'General';
  const priority = rulePriority(text);
  const sentiment = ruleSentiment(text);
  const cleanDescription = description.trim().replace(/\s+/g, ' ');
  const summary =
    cleanDescription.length > 110
      ? `${cleanDescription.slice(0, 107).trimEnd()}...`
      : cleanDescription;
  return {
    category,
    priority,
    summary: `${category} issue reported by customer: ${summary}`.slice(0, 140),
    suggestedResponse:
      `Thank you for contacting SupportFlow. Our team has received your ${category.toLowerCase()} request and an agent will review it shortly. We will keep you updated right here in this conversation.`,
    sentiment,
    provider: 'rules',
  };
}

/**
 * Run the full triage chain: Gemini → GLM → rules.
 * Always resolves with a valid suggestion object (provider: gemini|glm|rules).
 */
export async function runTriage({ subject, description, customerCategory }) {
  const prompt = buildTriagePrompt({ subject, description, customerCategory });
  const ai = await generateJson(prompt);
  if (ai) {
    const validated = validateTriage(ai.data);
    if (validated) {
      return { ...validated, provider: ai.provider, error: '' };
    }
  }
  const fallback = rulesTriage({ subject, description, customerCategory });
  return { ...fallback, error: '' };
}

/** Jaccard similarity over meaningful tokens — used for duplicate detection. */
export function similarityScore(textA, textB) {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}
