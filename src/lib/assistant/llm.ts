import { SDG17_EXPLAINER, PLATFORM_HELP, DISCLAIMER } from './knowledge';

/**
 * Open-weight LLM fallback via Groq (groq.com) — an OpenAI-compatible chat
 * completions API that hosts open-source models (Llama 3.x, Gemma 2, etc.)
 * on custom inference hardware built for low latency. Free tier, no credit
 * card required to start.
 *
 * This is deliberately the LAST tier the assistant tries, after the exact
 * rule-based intents and the keyword knowledge base — every action the
 * assistant can actually perform (profile/progress/pledges/reminders) stays
 * on the deterministic, permission-checked path in message/route.ts and
 * assistant/tools.ts; the LLM only ever produces read-only prose answers, is
 * fed a strict system prompt grounding it to real platform facts, and is
 * never given tool-calling access. That split is what makes this safe to
 * turn on without redoing the audit-logged tool layer.
 *
 * Inert (isLlmConfigured() === false) until GROQ_API_KEY is set — the
 * assistant works exactly as before without it, just without this extra
 * open-ended tier.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/* Groq rotates its hosted model line-up, so a hardcoded id eventually 404s
   (llama-3.3-70b-versatile did). Primary is the strongest open-weight model
   available; FALLBACK_MODEL is a second, differently-built one used when the
   primary returns an empty completion — gpt-oss routes some replies through a
   `reasoning` field and leaves `content` blank, which would otherwise drop
   the answer silently. Both are overridable via GROQ_MODEL. */
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'qwen/qwen3.8-27b';

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

const SYSTEM_PROMPT = `You are the Stud AI Assistant on the SDG 17 Global Partnership Platform.

Ground truth about the platform (do not contradict this):
${PLATFORM_HELP}

${SDG17_EXPLAINER}

Rules you must follow:
- Only answer using the facts above and general public knowledge about SDG 17 and sustainable development. Never invent a platform feature, statistic, dataset, or number that isn't given to you.
- The platform does NOT have: investor-company matching, in-platform messaging, pitch rooms, document sharing, or notifications. If asked, say so plainly and suggest the Partnership Builder instead.
- You cannot take any action yourself (you cannot create reminders, change data, or send anything) — if the user is asking you to do something rather than explain something, tell them to use the exact phrasing the platform's built-in commands expect, or to use the relevant page directly.
- Never give personalised financial, investment, legal, or tax advice. General education only.
- Keep answers under 120 words, plain language, no markdown headers or bullet walls — this renders in a small chat panel.
- If you are not confident of an honest answer, say you're not sure and suggest contacting support instead of guessing.`;

export interface LlmResult {
  text: string;
  usedDisclaimer: boolean;
}

/**
 * Asks the LLM a single grounded question. Returns null on any failure
 * (missing key, network error, non-200, empty completion) so the caller can
 * fall back to the existing generic response — this must never throw.
 */
async function callGroq(apiKey: string, model: string, message: string, previousTopic?: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + (previousTopic ? `\n\nThe user was just discussing: ${previousTopic}.` : '') },
        { role: 'user', content: message }
      ]
    })
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    console.error('[assistant/llm] Groq responded', res.status, model, await res.text().catch(() => ''));
    return null;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  // Only `content` is ever used. Some models also return a `reasoning` field
  // holding their chain of thought — that is working-out, not an answer, and
  // must never be shown to a user.
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function askLlm(message: string, opts?: { previousTopic?: string }): Promise<LlmResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const financeTouching = /\b(invest|budget|money|fund|roi|return|profit|loan|stock|crore|lakh|rupee|₹)\b/i.test(message);
  const primary = process.env.GROQ_MODEL || DEFAULT_MODEL;

  try {
    let text = await callGroq(apiKey, primary, message, opts?.previousTopic);

    // One retry on a different model when the primary returns nothing usable.
    // Skipped when GROQ_MODEL pins a specific model — an explicit choice
    // should not be silently overridden.
    if (!text && !process.env.GROQ_MODEL && primary !== FALLBACK_MODEL) {
      text = await callGroq(apiKey, FALLBACK_MODEL, message, opts?.previousTopic);
    }
    if (!text) return null;

    return { text: financeTouching ? `${text}\n\n${DISCLAIMER}` : text, usedDisclaimer: financeTouching };
  } catch (error) {
    console.error('[assistant/llm] request failed', error);
    return null;
  }
}
