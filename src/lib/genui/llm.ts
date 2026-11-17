import { getGenuiModel, getOpenAiBaseUrl } from "@/config/genui";

export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmResult = {
  content: string;
  model: string;
  usage?: { input: number; output: number };
};

export function hasLlmApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Server-only OpenAI-compatible chat completions.
 * API key never leaves this module / route handlers.
 */
export async function chatJson(messages: LlmChatMessage[]): Promise<LlmResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server. Add it to .env.local."
    );
  }

  const model = getGenuiModel();
  const base = getOpenAiBaseUrl();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `LLM request failed (${res.status}): ${text.slice(0, 240)}`
    );
  }

  const json = JSON.parse(text) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("LLM returned empty content");
  }

  return {
    content,
    model: json.model || model,
    usage: {
      input: json.usage?.prompt_tokens || 0,
      output: json.usage?.completion_tokens || 0,
    },
  };
}
