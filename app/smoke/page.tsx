"use client";
// F3: smoke test runner, started from the front end
import { useState } from "react";
import Nav from "../components/Nav";
import StrategyModelPicker, { type Strategy } from "../components/StrategyModelPicker";

type Row = {
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
};

export default function Smoke() {
  const [dataset, setDataset] = useState<"labelled100" | "tickets500">("labelled100");
  const [sampleSize, setSampleSize] = useState(20);
  const [strategy, setStrategy] = useState<Strategy>("llm");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function run() {
    setLoading(true);
    setError("");
    setSummary(null);
    setRows([]);
    try {
      const res = await fetch("/api/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, sampleSize, strategy, model: model || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error}:\n${data.details}` : data.error || "Request failed");
      setSummary(data.summary);
      setRows(data.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const max = dataset === "labelled100" ? 100 : 500;
  const cell = { padding: "4px 8px", borderBottom: "1px solid #e3e7ee", fontSize: 13 } as const;
  const bad = { ...cell, color: "#a51d25", fontWeight: "bold" } as const;

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <Nav />
      <h1>Smoke test</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label>
          Dataset{" "}
          <select value={dataset} onChange={(e) => setDataset(e.target.value as any)}>
            <option value="labelled100">Labelled 100 tickets</option>
            <option value="tickets500">500 tickets (unlabelled)</option>
          </select>
        </label>
        <label>
          Random sample size{" "}
          <input
            type="number"
            min={1}
            max={max}
            value={sampleSize}
            onChange={(e) => setSampleSize(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
            style={{ width: 80 }}
          />
        </label>
      </div>
      <StrategyModelPicker strategy={strategy} onStrategy={setStrategy} model={model} onModel={setModel} />
      <button onClick={run} disabled={loading}>{loading ? `Running ${sampleSize} tickets...` : "Run smoke test"}</button>

      {error && <pre role="alert" style={{ color: "#a51d25", whiteSpace: "pre-wrap" }}>{error}</pre>}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 20 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", background: "white" }}>
            <thead>
              <tr>
                {["Ticket", "Subject", "Predicted category", "Labelled category", "Predicted priority", "Labelled priority", "Model used", "DM conf. (cat/prio)", "Latency", "Tokens"].map((h) => (
                  <th key={h} style={{ ...cell, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                r.outcome !== "ok" ? (
                  <tr key={r.ticket_id}>
                    <td style={cell}>{r.ticket_id}</td>
                    <td style={cell}>{r.subject}</td>
                    <td style={bad} colSpan={8}>{r.outcome.toUpperCase()}: {r.error}</td>
                  </tr>
                ) : (
                  <tr key={r.ticket_id}>
                    <td style={cell}>{r.ticket_id}</td>
                    <td style={cell}>{r.subject}</td>
                    <td style={r.categoryMatch === false ? bad : cell}>{r.predicted?.category}</td>
                    <td style={cell}>{r.expected?.category ?? "—"}</td>
                    <td style={r.priorityMatch === false ? bad : cell}>{r.predicted?.priority}</td>
                    <td style={cell}>{r.expected?.priority ?? "—"}</td>
                    <td style={cell}><code>{r.modelUsed}</code>{r.fellBackToLlm ? " (fallback)" : ""}</td>
                    <td style={cell}>
                      {r.dmConfidence ? `${(r.dmConfidence.category * 100).toFixed(0)}% / ${(r.dmConfidence.priority * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={cell}>{r.latencyMs} ms</td>
                    <td style={cell}>{r.totalTokens}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <div style={{ background: "white", border: "1px solid #ccd3df", borderRadius: 12, padding: 16, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <p>
            <b>{summary.sampleSize}</b> tickets · model <code>{summary.model}</code> · strategy {summary.strategy}
            <br />
            Outcomes: {summary.outcomes.ok} ok, {summary.outcomes.rejected} rejected, {summary.outcomes.error} errors
          </p>
          {summary.labelled && (
            <p>
              Category mismatches: <b>{summary.categoryMismatches}</b> / {summary.outcomes.ok} (accuracy {summary.categoryAccuracy}%)
              <br />
              Priority mismatches: <b>{summary.priorityMismatches}</b> / {summary.outcomes.ok} (accuracy {summary.priorityAccuracy}%)
              <br />
              Both correct: {summary.bothCorrectAccuracy}%
            </p>
          )}
          {summary.dmFallbacks !== null && <p>Fell back to LLM: {summary.dmFallbacks} / {summary.outcomes.ok}</p>}
          <p>
            Avg latency {summary.avgLatencyMs} ms (p50 {summary.p50LatencyMs} ms) · {summary.totalTokens} tokens · est. cost $
            {summary.costUsd.toFixed(5)} · run logged, see <a href="/admin">/admin</a>
          </p>
        </div>
      )}
    </main>
  );
}
