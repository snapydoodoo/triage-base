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

Smoke tests on the labelled 100 set (random samples), plus single-ticket tests for all three strategies.

| Strategy | Model(s) | N | Category acc. | Priority acc. | Both correct | Avg latency | p50 latency | Total tokens | Est. cost | Errors |
|---|---|---|---|---|---|---|---|---|---|---|
| llm | gemini-flash-latest | 5 | 80% | 100% | 80% | 39,630 ms | 41,461 ms | 4,610 | $0.00673 | 0 |
| dm | vllm-sr/d3-turbo | 20 | 90% | 80% | 75% | 297 ms | 206 ms | 9,934 (input only) | $0 | 0 |
| dm+llm | d3-turbo → gemini-flash-latest | 1 (single ticket) | – | – | – | 37,066 ms | – | 1,139 | $0.000825 | 0 |

Single-ticket test ("charged twice, please refund"): all three strategies answered billing / medium. The DM took 552 ms for $0, and Gemini took 46,429 ms. In dm+llm, the DM was 100% sure of the category but only 66.5% sure of the priority (below the 0.7 threshold), so it handed the ticket to Gemini, as designed.

Cost is estimated at the paid list price in `lib/models.ts`. The free tiers cost $0 in practice.

## 4. Analysis

- **Speed:** the decision model was about 130 times faster than Gemini (297 ms against 39.6 s on average). Gemini was especially slow on the free tier.
- **Cost:** the DM bills input tokens only and generates no text: about 500 tokens per ticket and $0 on the free tier. Gemini used about 920 tokens per ticket, because it also writes a summary and an action, and its output and thinking tokens are billed.
- **Accuracy:** the DM did well on category (90%, 2 mismatches out of 20), but priority was its weak point (80%, 4 mismatches). Gemini got all 5 priorities right and 4 out of 5 categories. Priority is the harder label, because medium vs high is a judgement call. The DM's low confidence on priority in the single-ticket test matches this.
- **Confidence:** the DM tells us how sure it is, and the hybrid acts on that number. The uncertain decisions (mostly priority) go to Gemini, and the confident ones stay fast and free.
- **What the DM cannot do:** it gives no summary and no suggested action, only labels and probabilities.
- **Limits:** the samples are small (5 and 20 tickets, not the same tickets) and there is one run per strategy, because Gemini took about 40 s per ticket on the free tier. The results are indicative, not conclusive.

## 5. Conclusion

dm+llm is the best fit for this app. The decision model is fast, free and good at categories, so it handles the tickets it is confident about. Gemini handles the uncertain ones (mostly priority) and writes the summary and action for the agent. With more time, we would run all three strategies on the same full labelled 100 set and tune the 0.7 threshold.