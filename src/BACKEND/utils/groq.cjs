// src/BACKEND/utils/groq.cjs
// Minimal Groq client (OpenAI-compatible Chat Completions API).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

const getModel = () => process.env.GROQ_MODEL || DEFAULT_MODEL;
const isReasoning = () => /gpt-oss|qwen3|deepseek-r1/i.test(getModel());
const isConfigured = () => Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());

class GroqError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

/**
 * Send a chat completion request to Groq.
 * @param {object} opts
 * @param {Array<{role: string, content: string}>} opts.messages
 * @param {boolean} [opts.json]  Ask the model for a JSON object response
 * @returns {Promise<string>} The assistant message content
 */
async function groqChat({ messages, json = false, temperature = 0.3, maxTokens = 1400 }) {
  if (!isConfigured()) {
    throw new GroqError("Groq is not configured. Add GROQ_API_KEY to src/BACKEND/.env and restart the server.", 503);
  }

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature,
        // Reasoning models spend tokens thinking first: keep it brief and leave room for the answer
        max_tokens: isReasoning() ? maxTokens + 1200 : maxTokens,
        ...(isReasoning() ? { reasoning_effort: "low" } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    throw new GroqError(`Could not reach Groq: ${err.message}`, 502);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.error?.message || res.statusText;
    if (res.status === 401) throw new GroqError("Groq rejected the API key (401). Check GROQ_API_KEY.", 502);
    if (res.status === 429) throw new GroqError("Groq rate limit reached. Try again in a moment.", 429);
    if (res.status === 404 || /model/i.test(detail)) {
      throw new GroqError(`Groq model error for "${getModel()}": ${detail}. Set GROQ_MODEL to a current model.`, 502);
    }
    throw new GroqError(`Groq error (${res.status}): ${detail}`, 502);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

/** Parse a JSON object from model output, tolerating code fences or stray text. */
function parseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function groqJson(opts) {
  const text = await groqChat({ ...opts, json: true });
  const parsed = parseJson(text);
  if (!parsed) throw new GroqError("Groq returned a response that was not valid JSON.", 502);
  return parsed;
}

module.exports = { groqChat, groqJson, isConfigured, getModel, GroqError };
