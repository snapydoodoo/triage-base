"use client";
// F5: pick two runs and see them side by side
import { useState } from "react";

export type Run = {
  id: string;
  at: string;
  dataset: string;
  strategy: string;
  model: string;
  sampleSize: number;
  outcomes: { ok: number; rejected: number; error: number };
  labelled: boolean;
  categoryMismatches: number | null;
  priorityMismatches: number | null;
  categoryAccuracy: number | null;
  priorityAccuracy: number | null;
  bothCorrectAccuracy: number | null;
  dmFallbacks: number | null;
  avgLatencyMs: number;
  p50LatencyMs: number;
  totalTokens: number;
  costUsd: number;
};

const label = (r: Run) => `${new Date(r.at).toLocaleString()} · ${r.strategy} · ${r.model} · ${r.dataset} (${r.sampleSize})`;

export default function CompareRuns({ runs }: { runs: Run[] }) {
  const [a, setA] = useState(runs[1]?.id ?? runs[0].id);
  const [b, setB] = useState(runs[0].id);
  const ra = runs.find((r) => r.id === a)!;
  const rb = runs.find((r) => r.id === b)!;

  const lines: [string, (r: Run) => string][] = [
    ["Strategy", (r) => r.strategy],
    ["Model", (r) => r.model],
    ["Dataset / N", (r) => `${r.dataset} / ${r.sampleSize}`],
    ["OK / rejected / errors", (r) => `${r.outcomes.ok} / ${r.outcomes.rejected} / ${r.outcomes.error}`],
    ["Category accuracy", (r) => (r.categoryAccuracy === null ? "—" : `${r.categoryAccuracy}%`)],
    ["Priority accuracy", (r) => (r.priorityAccuracy === null ? "—" : `${r.priorityAccuracy}%`)],
    ["Both correct", (r) => (r.bothCorrectAccuracy === null ? "—" : `${r.bothCorrectAccuracy}%`)],
    ["LLM fallbacks", (r) => (r.dmFallbacks === null ? "—" : String(r.dmFallbacks))],
    ["Avg latency", (r) => `${r.avgLatencyMs} ms`],
    ["p50 latency", (r) => `${r.p50LatencyMs} ms`],
    ["Total tokens", (r) => String(r.totalTokens)],
    ["Est. cost", (r) => `$${r.costUsd.toFixed(5)}`],
  ];
  const cell = { padding: "4px 12px", borderBottom: "1px solid #e3e7ee", fontSize: 13 } as const;

  return (
    <section>
      <h2>Compare two runs</h2>
      <div style={{ display: "grid", gap: 8, maxWidth: 700 }}>
        <select value={a} onChange={(e) => setA(e.target.value)}>
          {runs.map((r) => <option key={r.id} value={r.id}>A: {label(r)}</option>)}
        </select>
        <select value={b} onChange={(e) => setB(e.target.value)}>
          {runs.map((r) => <option key={r.id} value={r.id}>B: {label(r)}</option>)}
        </select>
      </div>
      <table style={{ borderCollapse: "collapse", background: "white", marginTop: 12 }}>
        <thead>
          <tr><th style={cell}></th><th style={cell}>Run A</th><th style={cell}>Run B</th></tr>
        </thead>
        <tbody>
          {lines.map(([name, f]) => (
            <tr key={name}>
              <td style={{ ...cell, color: "#555" }}>{name}</td>
              <td style={cell}>{f(ra)}</td>
              <td style={cell}>{f(rb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
