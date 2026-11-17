import type { GenuiStyle } from "@/config/genui";
import { buildFixtureSchema } from "@/lib/genui/fixtures";
import { sha256Hex } from "@/lib/genui/ids";
import { chatJson, hasLlmApiKey } from "@/lib/genui/llm";
import {
  buildGenerateUserPrompt,
  generateSystemPrompt,
} from "@/lib/genui/prompts";
import type { DesignIntent, UiSchema } from "@/lib/genui/types";
import { validateUiSchemaFromModelText } from "@/lib/genui/validate";

export type GenerateResult = {
  schema: UiSchema;
  mode: "llm" | "fixture";
  model: string;
  provider: string;
  rawHash: string;
  usage?: { input: number; output: number };
};

export async function generateUiSchema(opts: {
  prompt: string;
  intent: DesignIntent;
  style: GenuiStyle;
  /** Explicit local sample — never claimed as LLM */
  allowFixture?: boolean;
}): Promise<GenerateResult> {
  const { prompt, intent, style, allowFixture } = opts;

  if (allowFixture || !hasLlmApiKey()) {
    if (!allowFixture && !hasLlmApiKey()) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Add a server key, or use “Load sample schema” for a local fixture."
      );
    }
    const schema = buildFixtureSchema(intent, style);
    const raw = JSON.stringify(schema);
    return {
      schema,
      mode: "fixture",
      model: "local-fixture",
      provider: "fixture",
      rawHash: await sha256Hex(raw),
    };
  }

  const llm = await chatJson([
    { role: "system", content: generateSystemPrompt(style) },
    {
      role: "user",
      content: buildGenerateUserPrompt(prompt, intent, style),
    },
  ]);

  let validated = validateUiSchemaFromModelText(llm.content);
  if (!validated.ok) {
    // One repair pass
    const repair = await chatJson([
      {
        role: "system",
        content: `${generateSystemPrompt(style)}\nFix the JSON so it passes validation. Return ONLY JSON.`,
      },
      {
        role: "user",
        content: `Previous output failed validation:\n${validated.issues.join(
          "\n"
        )}\n\nOriginal output:\n${llm.content.slice(0, 6000)}`,
      },
    ]);
    validated = validateUiSchemaFromModelText(repair.content);
    if (!validated.ok) {
      throw new Error(
        `Generated schema invalid: ${validated.issues.slice(0, 5).join("; ")}`
      );
    }
    return {
      schema: validated.schema,
      mode: "llm",
      model: repair.model,
      provider: "openai-compatible",
      rawHash: await sha256Hex(repair.content),
      usage: repair.usage,
    };
  }

  return {
    schema: validated.schema,
    mode: "llm",
    model: llm.model,
    provider: "openai-compatible",
    rawHash: await sha256Hex(llm.content),
    usage: llm.usage,
  };
}
