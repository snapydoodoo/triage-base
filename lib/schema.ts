// F1: every payload that enters or leaves the triage API has a Zod schema.
import { z } from "zod";

export const CATEGORIES = ["billing", "technical_bug", "account", "feature_request"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const STRATEGIES = ["llm", "dm", "dm+llm"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export const MAX_TICKET_CHARS = 5000;

// What the front end sends to POST /api/triage
export const TriageRequestSchema = z.object({
  ticket: z
    .string({ error: "Ticket must be a string" })
    .trim()
    .min(1, "Ticket must not be empty")
    .max(MAX_TICKET_CHARS, `Ticket is too long (max ${MAX_TICKET_CHARS} characters)`),
  strategy: z.enum(STRATEGIES).default("llm"),
  model: z.string().min(1).optional(),
});

// What the LLM must return (triage v2 = structured JSON instead of free text)
export const LlmTriageOutputSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  needs_human_review: z.boolean(),
  summary: z.string().min(1),
  suggested_action: z.string().min(1),
});
export type LlmTriageOutput = z.infer<typeof LlmTriageOutputSchema>;

// JSON schema sent to Gemini so it answers in the right shape (generated from the Zod schema)
const { $schema: _ignored, ...llmJsonSchema } = z.toJSONSchema(LlmTriageOutputSchema) as Record<string, unknown>;
export const LLM_TRIAGE_JSON_SCHEMA = llmJsonSchema;

export const UsageSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type Usage = z.infer<typeof UsageSchema>;

// What POST /api/triage returns to the front end
export const TriageResponseSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  needs_human_review: z.boolean(),
  summary: z.string().nullable(),          // null when only the decision model ran (it cannot write)
  suggested_action: z.string().nullable(),
  strategy: z.enum(STRATEGIES),
  modelUsed: z.string(),
  promptVersion: z.string(),
  usage: UsageSchema,
  costUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
  dmConfidence: z
    .object({ category: z.number(), priority: z.number(), needs_human_review: z.number() })
    .nullable(),
  fellBackToLlm: z.boolean().nullable(),   // only for dm+llm
});
export type TriageResponse = z.infer<typeof TriageResponseSchema>;

// What the front end sends to POST /api/smoke
export const SmokeRequestSchema = z.object({
  dataset: z.enum(["labelled100", "tickets500"]),
  sampleSize: z.number().int().min(1).max(500),
  strategy: z.enum(STRATEGIES).default("llm"),
  model: z.string().min(1).optional(),
});
