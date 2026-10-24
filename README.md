# Support ticket triage app

Next.js app that triages Kestrel Analytics support tickets with an LLM (Gemini),
a decision model (vLLM Semantic Router Decision 3.0), or both.

## Features

| Page | What it does |
|---|---|
| `/` | Chat with memory: the whole conversation history is sent on every turn |
| `/triage` | Triage v2: one ticket → category, priority, human-review flag, summary, suggested action. Shows token usage (input / output / total), estimated cost, latency, the model used and, for the decision model, its confidence |
| `/smoke` | Smoke test runner: pick a dataset (labelled 100 or 500), a random sample size, a strategy and a model. Shows predicted vs labelled category / priority per ticket and the mismatch summary |
| `/admin` | Every logged smoke test run (accuracy, outcome counts, latency, tokens, cost, model) + side-by-side comparison of two runs + recent single triage calls |

**Strategies** (selectable on `/triage` and `/smoke`):

- `llm` – Gemini only.
- `dm` – decision model only (`vllm-sr/d3-turbo`): labels and probabilities, no text.
- `dm+llm` – decision model first; if its confidence on category or priority is below
  `DM_CONFIDENCE_THRESHOLD` (0.7), Gemini triages the ticket instead.

See [`LLM-DM-report.md`](./LLM-DM-report.md) for the decision model research and results.

## Validation (F1)

All schemas live in `lib/schema.ts` (Zod):

- `TriageRequestSchema` – `{ ticket (1–5000 chars), strategy, model? }`. Invalid requests get HTTP 400 with a readable message, shown on the front end.
- `LlmTriageOutputSchema` – the LLM answer. It is converted to a JSON schema and sent to Gemini (`responseJsonSchema`), then the answer is validated with Zod.
- `TriageResponseSchema` – what the API returns; validated before it is sent.
- Decision model answers are validated in `lib/dm.ts` (unknown labels are rejected).

## Code map

```
lib/schema.ts    Zod schemas (request, LLM output, response, smoke request)
lib/prompt.ts    triage-v2 system prompt (v1 kept for reference)
lib/triage.ts    Gemini triage v2 (JSON output + Zod + token usage)
lib/dm.ts        decision model client (POST /v1/systemone)
lib/strategy.ts  llm / dm / dm+llm
lib/models.ts    model list (F5) and price table for cost estimates
lib/logs.ts      JSONL logs in logs/
lib/data.ts      datasets + random sampling
app/api/triage   POST triage one ticket
app/api/smoke    POST run a smoke test
app/api/models   GET available models
```

## Setup

Requires Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local   # then fill in LLM_API_KEY and DECISION_API_KEY
npm run dev
```

- `LLM_API_KEY`: Google AI Studio key.
- `DECISION_API_KEY`: free key from https://decision.vllm-sr.ai (one click, no account).
- `LLM_MODELS`: comma-separated list for the model menu.

Open http://localhost:3033. Logs are written to `logs/triage-calls.jsonl` and `logs/smoke-runs.jsonl`.

## Sample data

- `data/support_tickets_500.*` – 500 unlabelled tickets.
- `data/support_tickets_100_labelled.*` – 100 tickets with category, priority and needs_human_review labels.

Ticket TCK-10308 is longer than 5000 characters: the request schema rejects it, and the smoke test counts it as `rejected`.

## Checks

```sh
npm run typecheck
npm run build
```
