import {
  getGenuiModel,
  getGenuiVisionModel,
  getOpenAiBaseUrl,
} from "@/config/genui";

export type LlmTextPart = { type: "text"; text: string };
export type LlmImagePart = {
  type: "image_url";
  image_url: { url: string; detail?: "low" | "high" | "auto" };
};

export type LlmContentPart = LlmTextPart | LlmImagePart;

export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
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
 * Heuristic: only claim vision when an explicit vision model is configured
 * OR the active model name looks multimodal. Never pretend otherwise.
 */
export function supportsVisionModel() {
  if (!hasLlmApiKey()) return false;
  if (process.env.GENUI_VISION_MODEL?.trim()) return true;
  const forced = process.env.GENUI_FORCE_VISION === "1";
  if (forced) return true;
  const name = getGenuiVisionModel().toLowerCase();
  return /gpt-4o|gpt-4\.1|gpt-4-turbo|claude-3|claude-4|gemini|vision|llava|qwen.*vl|grok-2-vision/.test(
    name
  );
}

/**
 * Server-only OpenAI-compatible chat completions.
 * API key never leaves this module / route handlers.
 */
export async function chatJson(
  messages: LlmChatMessage[],
  opts?: { model?: string; temperature?: number }
): Promise<LlmResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server. Add it to .env.local."
    );
  }

  const model = (opts?.model || getGenuiModel()).trim();
  const base = getOpenAiBaseUrl();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: opts?.temperature ?? 0.4,
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

/** Multimodal JSON chat — only call when supportsVisionModel() is true. */
export async function chatJsonVision(
  messages: LlmChatMessage[]
): Promise<LlmResult> {
  if (!supportsVisionModel()) {
    throw new Error(
      "Vision is not enabled for the configured model. Set GENUI_VISION_MODEL to a multimodal model, or remove reference images."
    );
  }
  return chatJson(messages, {
    model: getGenuiVisionModel(),
    temperature: 0.2,
  });
}
