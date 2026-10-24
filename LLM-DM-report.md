# LLM vs Decision Model – Report

Course: AI Systems Integration and Operations – BCS S5 – EPITA 2026
App: Kestrel Analytics support ticket triage (categories: billing, technical_bug, account, feature_request; priorities: low, medium, high)

## 1. Decision model research

Hosted decision models found (October 2026):

| Provider | Model | Endpoint | Free? | Notes |
|---|---|---|---|---|
| **vLLM Semantic Router** | `vllm-sr/d3-turbo` (alias `vllm-sr/d3`), Decision 3.0, 27B, Apache-2.0 | `POST https://decision.vllm-sr.ai/v1/systemone` | **Yes**: free key in one click, no account | Free-tier limits: up to 64 questions and ~131k characters per request |
| OpenRouter | `typesafe/jev-1.13` (TypeSafe Jev) | `/api/v1/systemone`, `/api/alpha/decisions` | No: input tokens charged | Same System One contract |
| OpenAI | Decisions API (GPT-6 Luna) | `POST /v1/decisions` | No free tier found: needs OpenAI API billing | Public beta since 6 Oct |
| TypeSafe AI | Jev | `POST /v1/systemone` | Early access only, signups were paused | Created the category |
| LangChain LLM gateway | SemIf (`semif-qwen3.5-4b`) | `/v1/systemone` | Was free only until 28 Sept 2026 | Needs a LangSmith workspace key |
| Perplexity, Cloudflare, AWS, Liquid AI | pplx-decider, Clef, Strands Decider, d1 | various / not confirmed | Open weights or paid hosting | Not a free hosted service we could use |
| LocalAI / Ollama | Laya, Nimble, Tev1… | `/v1/systemone` on localhost | Free, but self-hosted | Large downloads and RAM; not "hosted" |

**Selected: vLLM Semantic Router Decision 3.0 (`vllm-sr/d3-turbo`).**

- It is the only hosted option that is free with no account and no credit card.
- It uses the System One contract shown in class (`state` + typed `questions`), so switching later to Jev on OpenRouter only means changing the base URL, key and model name (`DM_BASE_URL`, `DECISION_API_KEY`, `DM_MODEL`).
- d3-turbo reads the input once and answers all questions in one pass, so asking 3 questions (category, priority, human review) costs about the same as asking 1.
- Our label sets are small (4 categories, 3 priorities), which is where decision models do best.

## 2. Integration strategy

The user picks the strategy on `/triage` and `/smoke`:

| Strategy | How it works | Output |
|---|---|---|
| `llm` | Gemini, prompt `triage-v2`, JSON output enforced with a JSON schema + Zod | labels + summary + suggested action |
| `dm` | One `/v1/systemone` call with 3 questions: `category` (choice), `priority` (choice), `needs_human_review` (noul). The criteria are the same category/priority definitions as the LLM prompt | labels + probabilities, no text |
| `dm+llm` | The DM decides first. If its confidence on category **or** priority is below **0.7**, the ticket goes to Gemini | DM labels when confident, full LLM triage otherwise |

Why this hybrid: the DM is fast and almost free, and it tells us how sure it is. We act on that probability (slide "when to reach for a decision model", question 3): confident tickets are handled cheaply, unsure ones get the stronger, more expensive model.

Safety and validation:

- The ticket is untrusted text: it only goes in `state`. The options come from our code, so the DM cannot answer outside them.
- The DM response is validated with Zod and unknown labels are rejected.
- Tickets over 5000 characters are rejected by `TriageRequestSchema` (TCK-10308).

Observability: every triage call and every smoke test run is logged with the strategy and the model used (`dm+llm` runs show `vllm-sr/d3-turbo -> gemini-…` when the LLM took over). `/admin` lists them and compares two runs side by side.

## 3. Results

Smoke test on the labelled 100 set, N = ___ tickets (same sample size for all runs).

| Strategy | Model(s) | Category acc. | Priority acc. | Both correct | Avg latency | p50 latency | Total tokens | Est. cost | LLM fallbacks | Errors |
|---|---|---|---|---|---|---|---|---|---|---|
| llm | gemini-flash-latest | __% | __% | __% | __ ms | __ ms | __ | $__ | – | __ |
| dm | vllm-sr/d3-turbo | __% | __% | __% | __ ms | __ ms | __ (input only) | $0 (free tier) | – | __ |
| dm+llm | d3-turbo → gemini-flash-latest | __% | __% | __% | __ ms | __ ms | __ | $__ | __ / N | __ |

Cost is estimated at the paid list price in `lib/models.ts` (the free tiers cost $0 in practice).

## 4. Analysis

- **Accuracy:** ___ (Which strategy is best on category? On priority? Priority is the harder label: medium vs high is a judgement call.)
- **Calibration:** ___ (On the tickets the DM got wrong, what confidence did it show? Was it ever very sure and wrong?)
- **Speed and cost:** ___ (DM vs LLM latency. The DM bills input tokens only, the LLM also bills output and thinking tokens.)
- **Hybrid:** ___ (How many tickets fell back to Gemini? Did the fallback fix the DM's mistakes? Would a different threshold be better?)
- **Hard tickets:** ___ (prompt injections, tone mismatch, multilingual tickets: did the DM resist them like the LLM?)
- **Limits:** the DM cannot write a summary or an action; small sample; one run per strategy; the free API rate-limits and its numbers can change week to week.

## 5. Conclusion

___ (Recommended strategy for this app and why.)
