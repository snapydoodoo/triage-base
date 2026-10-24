import { NextResponse } from "next/server";
import { z } from "zod";
import { TriageRequestSchema } from "../../../lib/schema";
import { runTriage } from "../../../lib/strategy";
import { appendLog, TRIAGE_LOG } from "../../../lib/logs";
import { availableModels } from "../../../lib/models";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // F1: validate the request with Zod -> clear 400 error for the front end
  const parsed = TriageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { ticket, strategy, model } = parsed.data;
  if (model && !availableModels().includes(model)) {
    return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
  }

  try {
    const result = await runTriage(ticket, strategy, model);
    await appendLog(TRIAGE_LOG, {
      at: new Date().toISOString(),
      strategy,
      modelUsed: result.modelUsed,
      category: result.category,
      priority: result.priority,
      fellBackToLlm: result.fellBackToLlm,
      usage: result.usage,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Triage failed" }, { status: 502 });
  }
}
