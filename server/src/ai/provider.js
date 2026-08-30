import config from '../config.js';

/**
 * AI provider chain with graceful degradation:
 *
 *   1. Google Gemini (primary) — uses GEMINI_API_KEY, server-side only.
 *   2. GLM via z-ai-web-dev-sdk (secondary) — used when Gemini is unavailable.
 *   3. Deterministic rules engine (last resort, triage only) — guarantees the
 *      ticket workflow never blocks on an AI outage, as required by the spec:
 *      "If the AI service fails or times out, the application must still allow
 *      the ticket to be handled manually."
 *
 * Every response is tagged with the provider that produced it.
 */

let cachedGeminiModel = null;
let zaiClient = null;
let zaiUnavailable = false;

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function callGemini(prompt, { json = true } = {}) {
  if (!config.geminiApiKey) return null;
  const models = cachedGeminiModel ? [cachedGeminiModel] : config.geminiModels;
  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.geminiTimeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      });
      clearTimeout(timer);
      if (!response.ok) {
        lastError = new Error(`Gemini ${response.status}`);
        continue; // try next model
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (!text) {
        lastError = new Error('Gemini returned an empty response');
        continue;
      }
      cachedGeminiModel = model;
      return { text, provider: 'gemini', model };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (cachedGeminiModel) cachedGeminiModel = null; // allow retry across models
    }
  }
  if (lastError) console.warn(`[ai] Gemini unavailable: ${lastError.message}`);
  return null;
}

// ---------------------------------------------------------------------------
// GLM (z-ai-web-dev-sdk)
// ---------------------------------------------------------------------------
async function callGlm(prompt) {
  if (zaiUnavailable) return null;
  try {
    if (!zaiClient) {
      const { default: ZAI } = await import('z-ai-web-dev-sdk');
      zaiClient = await ZAI.create();
    }
    const completion = await zaiClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      thinking: { type: 'disabled' },
    });
    const text = completion?.choices?.[0]?.message?.content || '';
    if (!text) return null;
    return { text, provider: 'glm' };
  } catch (err) {
    zaiUnavailable = true;
    console.warn(`[ai] GLM fallback unavailable: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
export function extractJson(text) {
  const trimmed = String(text || '').trim();
  // Strip markdown code fences if present
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(withoutFences);
  } catch {
    const match = withoutFences.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Ask the AI for a JSON object. Returns { data, provider } or null.
 */
export async function generateJson(prompt) {
  const gemini = await callGemini(prompt, { json: true });
  if (gemini) {
    const data = extractJson(gemini.text);
    if (data) return { data, provider: 'gemini' };
  }
  const glm = await callGlm(prompt);
  if (glm) {
    const data = extractJson(glm.text);
    if (data) return { data, provider: 'glm' };
  }
  return null;
}

/** Free-form text generation (chatbot). Returns { text, provider } or null. */
export async function generateText(prompt, systemPrompt) {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const gemini = await callGemini(fullPrompt, { json: false });
  if (gemini) return { text: gemini.text.trim(), provider: 'gemini' };
  const glm = await callGlm(fullPrompt);
  if (glm) return { text: glm.text.trim(), provider: 'glm' };
  return null;
}

export function providerStatus() {
  return {
    geminiConfigured: Boolean(config.geminiApiKey),
    glmConfigured: !zaiUnavailable,
    activeGeminiModel: cachedGeminiModel,
  };
}
