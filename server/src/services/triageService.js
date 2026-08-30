import { config } from '../config/index.js';

/**
 * AI triage engine — backed by Google Gemini.
 *
 * Analyzes ticket subject + description and produces a structured
 * suggestion: category, priority, summary, confidence.
 *
 * If GEMINI_API_KEY is set, we call Google's Gemini API
 * (generativelanguage.googleapis.com). On any failure (timeout, bad
 * response, network error), we fall back to the rule-based triage —
 * per the hackathon spec: "If the AI service fails or times out, the
 * application must still allow the ticket to be handled manually".
 */

const CATEGORY_KEYWORDS = {
  billing: [
    'charge', 'charged', 'refund', 'payment', 'invoice', 'bill', 'billing',
    'subscription', 'price', 'pricing', 'cost', 'fee', 'fees', 'double',
    'overcharged', 'tax', 'receipt', 'receipts', 'transaction', 'card',
    'credit card', 'paypal', 'coupon', 'discount',
  ],
  technical: [
    'bug', 'error', 'crash', 'broken', 'not working', 'issue', 'glitch',
    '500', '404', 'exception', 'stack trace', 'fail', 'failed', 'failing',
    'loading', 'won\'t load', 'blank', 'white screen', 'timeout', 'slow',
    'latency', 'api', 'integration', 'webhook', 'server',
    'down', 'offline', 'unavailable', 'unresponsive',
  ],
  shipping: [
    'ship', 'shipped', 'shipping', 'delivery', 'deliver', 'tracking',
    'package', 'parcel', 'courier', 'address', 'lost package', 'delayed',
    'late delivery', 'arrived', 'damaged', 'missing item', 'order status',
    'fulfillment', 'dispatch', 'transport',
  ],
  account: [
    'login', 'log in', 'sign in', 'signin', 'logout', 'password', 'reset',
    'account', 'profile', 'username', 'two-factor', '2fa', 'otp',
    'verification', 'verify', 'locked out', 'access', 'permission',
    'unauthorized', 'suspended', 'deactivated', 'account disabled',
  ],
  product: [
    'feature', 'how to', 'how do i', 'question', 'usage', 'tutorial',
    'guide', 'documentation', 'docs', 'help with', 'understand',
    'recommendation', 'suggest', 'advice', 'best practice', 'workflow',
    'capability', 'functionality', 'use case',
  ],
};

const HIGH_PRIORITY_KEYWORDS = [
  'urgent', 'asap', 'immediately', 'critical', 'emergency', 'severe',
  'broken', 'down', 'outage', 'cannot access', 'cannot login',
  'lost data', 'security', 'breach', 'leak', 'compromised',
  'lawsuit', 'legal', 'sue', 'attorney', 'lawyer',
  'double charged', 'overcharged', 'fraud', 'fraudulent',
  'angry', 'frustrated', 'disappointed', 'cancel subscription',
  'cancel my account', 'refund now', 'last chance',
];

const LOW_PRIORITY_INDICATORS = [
  'question', 'how do i', 'how to', 'curious', 'wondering',
  'suggestion', 'feedback', 'idea', 'feature request',
  'when will', 'any plans', 'roadmap',
];

const HIGH_PRIORITY_CATEGORIES = ['billing'];

function normalize(text) {
  return (text || '').toLowerCase();
}

function countKeywordMatches(text, keywords) {
  let count = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) count++;
  }
  return count;
}

function detectCategory(text) {
  let bestCategory = 'general';
  let bestScore = 0;
  const scores = {};

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = countKeywordMatches(text, kws);
    scores[cat] = score;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return { category: bestCategory, scores, confidence: Math.min(0.6 + bestScore * 0.1, 0.95) };
}

function detectPriority(text, category) {
  const highHits = countKeywordMatches(text, HIGH_PRIORITY_KEYWORDS);
  const lowHits = countKeywordMatches(text, LOW_PRIORITY_INDICATORS);

  if (highHits >= 1 || HIGH_PRIORITY_CATEGORIES.includes(category)) {
    return { priority: 'high', confidence: Math.min(0.7 + highHits * 0.1, 0.95) };
  }
  if (lowHits >= 1) {
    return { priority: 'low', confidence: 0.7 };
  }
  return { priority: 'medium', confidence: 0.65 };
}

function generateSummary(subject, description, category, priority) {
  const text = `${subject} ${description}`.toLowerCase();
  const parts = [];

  if (text.includes('refund')) {
    parts.push('Customer requests a refund');
  } else if (text.includes('cancel')) {
    parts.push('Customer wants to cancel');
  } else if (text.includes('cannot') || text.includes('can\'t') || text.includes('unable')) {
    parts.push('Customer reports being unable to complete an action');
  } else if (text.includes('broken') || text.includes('not working') || text.includes('error')) {
    parts.push('Customer reports a malfunction');
  } else if (text.includes('how') || text.includes('?')) {
    parts.push('Customer is asking a usage question');
  } else if (text.includes('charged') || text.includes('charge')) {
    parts.push('Customer reports a billing issue');
  } else if (text.includes('login') || text.includes('password') || text.includes('access')) {
    parts.push('Customer reports an account access problem');
  } else if (text.includes('delivery') || text.includes('shipping') || text.includes('order')) {
    parts.push('Customer reports an order/shipping concern');
  } else {
    parts.push('Customer reports an issue requiring review');
  }

  const categoryLabels = {
    billing: 'billing-related',
    technical: 'technical/bug-related',
    shipping: 'order fulfillment related',
    account: 'account access related',
    product: 'product usage related',
    general: 'general inquiry',
  };

  const catLabel = categoryLabels[category] || 'general';
  if (priority === 'high') {
    parts.push(`flagged as ${catLabel} with high urgency`);
  } else {
    parts.push(`flagged as ${catLabel}`);
  }

  return parts.join(', ') + '.';
}

function ruleBasedTriage(subject, description) {
  const text = normalize(`${subject} ${description}`);
  const { category, confidence: catConfidence } = detectCategory(text);
  const { priority, confidence: prioConfidence } = detectPriority(text, category);
  const summary = generateSummary(subject, description, category, priority);
  const confidence = (catConfidence + prioConfidence) / 2;

  return {
    category,
    priority,
    summary,
    confidence: Number(confidence.toFixed(2)),
    source: 'rule-based',
  };
}

/**
 * Call Google Gemini API to triage the ticket.
 * Uses the generateContent endpoint with structured JSON output.
 *
 * Authentication: the GEMINI_API_KEY is sent as a `key` query parameter,
 * which is the standard Google AI Studio authentication method. This works
 * for any key obtained from https://aistudio.google.com/app/apikey.
 *
 * Note: If you see "User location is not supported for the API use" in the
 * server logs, the Gemini API is not available from the server's region.
 * The rule-based fallback will handle triage in that case, and the Gemini
 * integration will work once deployed from a supported region.
 */
async function geminiTriage(subject, description) {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const endpoint = `${config.gemini.apiBase}/models/${config.gemini.model}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const systemPrompt =
      'You are a support ticket triage assistant. Analyze the ticket and respond with a JSON object ' +
      'containing exactly these fields:\n' +
      '- "category": one of "billing", "technical", "shipping", "account", "product", "general"\n' +
      '- "priority": one of "low", "medium", "high"\n' +
      '- "summary": one concise sentence describing the issue (max 200 characters)\n' +
      '- "confidence": a number between 0 and 1 indicating your confidence\n\n' +
      'Respond with ONLY the JSON object, no markdown, no explanation.';

    const userPrompt = `Subject: ${subject}\n\nDescription: ${description}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
          topP: 0.95,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    // Gemini response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('Gemini returned no candidates');
    }

    const parts = candidate.content?.parts || [];
    const textContent = parts.map((p) => p.text || '').join('').trim();
    if (!textContent) {
      // Possibly blocked by safety filters
      const blockReason = candidate.finishReason || data.promptFeedback?.blockReason;
      throw new Error(`Gemini returned empty content (finish: ${blockReason || 'unknown'})`);
    }

    // Parse JSON — strip any markdown code fences if present
    let jsonString = textContent;
    const fenceMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonString = fenceMatch[1].trim();
    }
    // Find the first { and last } as a final fallback
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonString);

    // Validate output
    const validCategories = ['billing', 'technical', 'shipping', 'account', 'product', 'general'];
    const validPriorities = ['low', 'medium', 'high'];

    if (!validCategories.includes(parsed.category)) {
      throw new Error(`Invalid category from Gemini: ${parsed.category}`);
    }
    if (!validPriorities.includes(parsed.priority)) {
      throw new Error(`Invalid priority from Gemini: ${parsed.priority}`);
    }
    if (typeof parsed.summary !== 'string' || parsed.summary.length === 0) {
      throw new Error('Invalid summary from Gemini');
    }

    return {
      category: parsed.category,
      priority: parsed.priority,
      summary: parsed.summary.slice(0, 300),
      confidence: typeof parsed.confidence === 'number'
        ? Math.min(Math.max(parsed.confidence, 0), 1)
        : 0.85,
      source: 'gemini',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function triageTicket(subject, description) {
  // Try Gemini first if configured, fall back to rule-based on any failure
  if (config.gemini.apiKey) {
    try {
      const result = await geminiTriage(subject, description);
      return result;
    } catch (err) {
      console.warn('[triage] Gemini failed, falling back to rule-based:', err.message);
    }
  }

  return ruleBasedTriage(subject, description);
}

export const CATEGORIES = ['billing', 'technical', 'shipping', 'account', 'product', 'general'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['new', 'assigned', 'in_progress', 'resolved'];
