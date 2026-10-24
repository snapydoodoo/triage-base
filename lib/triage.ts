// Triage v2 with the LLM (Gemini): structured JSON output, validated with Zod.
import { ai } from "./llm";
import { DEFAULT_MODEL } from "./models";
import { buildUserMessage, TRIAGE_SYSTEM_PROMPT } from "./prompt";
import { LLM_TRIAGE_JSON_SCHEMA, LlmTriageOutputSchema, type LlmTriageOutput, type Usage } from "./schema";
import { withRetry } from "./retry";
import { z } from "zod";

export class TriageError extends Error {}

export type LlmTriageResult = { output: LlmTriageOutput; usage: Usage; model: string };

export async function llmTriage(ticket: string, model: string = DEFAULT_MODEL): Promise<LlmTriageResult> {
  const response = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: buildUserMessage(ticket),
      config: {
        systemInstruction: TRIAGE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: LLM_TRIAGE_JSON_SCHEMA,
        temperature: 0,
      },
    })
  );

  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    throw new TriageError("The LLM did not return valid JSON");
  }
  const parsed = LlmTriageOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new TriageError(`The LLM output failed validation: ${z.prettifyError(parsed.error)}`);
  }

  // F2: token usage. "output" includes thinking tokens, because they are billed as output.
  const meta = response.usageMetadata;
  const input = meta?.promptTokenCount ?? 0;
  const total = meta?.totalTokenCount ?? input + (meta?.candidatesTokenCount ?? 0);
  return { output: parsed.data, usage: { input, output: Math.max(0, total - input), total }, model };
}
