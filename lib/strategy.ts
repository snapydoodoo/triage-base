// One entry point for the three strategies the user can pick in the front end.
//   llm     -> Gemini only (labels + summary + suggested action)
//   dm      -> decision model only (labels + probabilities, no text)
//   dm+llm  -> decision model first; if it is unsure (confidence < threshold), Gemini takes over
import { dmTriage } from "./dm";
import { llmTriage } from "./triage";
import { costUsd, DEFAULT_MODEL } from "./models";
import { PROMPT_VERSION } from "./prompt";
import { TriageResponseSchema, type Strategy, type TriageResponse } from "./schema";

export const DM_CONFIDENCE_THRESHOLD = Number(process.env.DM_CONFIDENCE_THRESHOLD ?? 0.7);

export async function runTriage(ticket: string, strategy: Strategy, model: string = DEFAULT_MODEL): Promise<TriageResponse> {
  const start = Date.now();
  let result: Omit<TriageResponse, "latencyMs">;

  if (strategy === "llm") {
    const llm = await llmTriage(ticket, model);
    result = {
      ...llm.output,
      strategy,
      modelUsed: llm.model,
      promptVersion: PROMPT_VERSION,
      usage: llm.usage,
      costUsd: costUsd(llm.model, llm.usage),
      dmConfidence: null,
      fellBackToLlm: null,
    };
  } else {
    const dm = await dmTriage(ticket);
    const unsure = Math.min(dm.confidence.category, dm.confidence.priority) < DM_CONFIDENCE_THRESHOLD;

    if (strategy === "dm" || !unsure) {
      result = {
        category: dm.category,
        priority: dm.priority,
        needs_human_review: dm.needs_human_review,
        summary: null,
        suggested_action: null,
        strategy,
        modelUsed: dm.model,
        promptVersion: "dm-v1",
        usage: dm.usage,
        costUsd: costUsd(dm.model, dm.usage),
        dmConfidence: dm.confidence,
        fellBackToLlm: strategy === "dm+llm" ? false : null,
      };
    } else {
      const llm = await llmTriage(ticket, model);
      const usage = {
        input: dm.usage.input + llm.usage.input,
        output: llm.usage.output,
        total: dm.usage.total + llm.usage.total,
      };
      result = {
        ...llm.output,
        strategy,
        modelUsed: `${dm.model} -> ${llm.model}`,
        promptVersion: PROMPT_VERSION,
        usage,
        costUsd: costUsd(dm.model, dm.usage) + costUsd(llm.model, llm.usage),
        dmConfidence: dm.confidence,
        fellBackToLlm: true,
      };
    }
  }

  // F1: validate our own response before it goes to the user
  return TriageResponseSchema.parse({ ...result, latencyMs: Date.now() - start });
}
