// F3 + F4: smoke test runner. Samples tickets, triages them with the chosen strategy/model,
// compares with the labels (100 set), logs the run for the /admin page.
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_TICKET_CHARS, SmokeRequestSchema } from "../../../lib/schema";
import { loadDataset, sample, ticketText } from "../../../lib/data";
import { runTriage } from "../../../lib/strategy";
import { appendLog, SMOKE_LOG } from "../../../lib/logs";
import { availableModels, DEFAULT_MODEL } from "../../../lib/models";
import { DM_MODEL } from "../../../lib/dm";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONCURRENCY = Number(process.env.SMOKE_CONCURRENCY ?? 2); // low, to stay under free-tier rate limits

export type SmokeRow = {
  ticket_id: string;
  subject: string;
  outcome: "ok" | "rejected" | "error";
  error?: string;
  predicted?: { category: string; priority: string };
  expected?: { category: string; priority: string };
  categoryMatch?: boolean;
  priorityMatch?: boolean;
  modelUsed?: string;
  fellBackToLlm?: boolean | null;
  dmConfidence?: { category: number; priority: number } | null;
  latencyMs?: number;
  totalTokens?: number;
  costUsd?: number;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = SmokeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const { dataset, sampleSize, strategy } = parsed.data;
  const model = parsed.data.model ?? DEFAULT_MODEL;
  if (!availableModels().includes(model)) {
    return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
  }

  const tickets = sample(await loadDataset(dataset), sampleSize);
  const labelled = dataset === "labelled100";
  const rows: SmokeRow[] = new Array(tickets.length);
  const started = Date.now();

  // Small worker pool: CONCURRENCY tickets in flight at a time
  let next = 0;
  async function worker() {
    while (next < tickets.length) {
      const i = next++;
      const t = tickets[i];
      const text = ticketText(t).trim();
      const row: SmokeRow = { ticket_id: t.ticket_id, subject: t.subject || "(no subject)", outcome: "ok" };
      if (labelled) row.expected = { category: t.category!, priority: t.priority! };

      if (text.length > MAX_TICKET_CHARS) {
        // Same rule as POST /api/triage: the request schema rejects it
        row.outcome = "rejected";
        row.error = `Ticket longer than ${MAX_TICKET_CHARS} characters (rejected by TriageRequestSchema)`;
      } else {
        try {
          const r = await runTriage(text, strategy, model);
          row.predicted = { category: r.category, priority: r.priority };
          row.modelUsed = r.modelUsed;
          row.fellBackToLlm = r.fellBackToLlm;
          row.dmConfidence = r.dmConfidence ? { category: r.dmConfidence.category, priority: r.dmConfidence.priority } : null;
          row.latencyMs = r.latencyMs;
          row.totalTokens = r.usage.total;
          row.costUsd = r.costUsd;
          if (labelled) {
            row.categoryMatch = r.category === t.category;
            row.priorityMatch = r.priority === t.priority;
          }
        } catch (err: any) {
          row.outcome = "error";
          row.error = String(err?.message ?? err).slice(0, 300);
        }
      }
      rows[i] = row;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tickets.length) }, worker));

  const ok = rows.filter((r) => r.outcome === "ok");
  const latencies = ok.map((r) => r.latencyMs!).sort((a, b) => a - b);
  const pct = (n: number) => (ok.length ? Math.round((n / ok.length) * 1000) / 10 : 0);
  const categoryCorrect = ok.filter((r) => r.categoryMatch).length;
  const priorityCorrect = ok.filter((r) => r.priorityMatch).length;

  const summary = {
    id: `run-${Date.now()}`,
    at: new Date().toISOString(),
    dataset,
    strategy,
    model: strategy === "llm" ? model : strategy === "dm" ? DM_MODEL : `${DM_MODEL} -> ${model}`,
    sampleSize: tickets.length,
    outcomes: {
      ok: ok.length,
      rejected: rows.filter((r) => r.outcome === "rejected").length,
      error: rows.filter((r) => r.outcome === "error").length,
    },
    labelled,
    categoryMismatches: labelled ? ok.length - categoryCorrect : null,
    priorityMismatches: labelled ? ok.length - priorityCorrect : null,
    categoryAccuracy: labelled ? pct(categoryCorrect) : null,
    priorityAccuracy: labelled ? pct(priorityCorrect) : null,
    bothCorrectAccuracy: labelled ? pct(ok.filter((r) => r.categoryMatch && r.priorityMatch).length) : null,
    dmFallbacks: strategy === "dm+llm" ? ok.filter((r) => r.fellBackToLlm).length : null,
    avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    p50LatencyMs: latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0,
    totalTokens: ok.reduce((a, r) => a + (r.totalTokens ?? 0), 0),
    costUsd: ok.reduce((a, r) => a + (r.costUsd ?? 0), 0),
    wallTimeMs: Date.now() - started,
  };

  await appendLog(SMOKE_LOG, summary);
  return NextResponse.json({ summary, rows });
}
