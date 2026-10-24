"use client";
import { useState } from "react";
import Nav from "../components/Nav";
import StrategyModelPicker, { type Strategy } from "../components/StrategyModelPicker";

type TriageResponse = {
  category: string;
  priority: string;
  needs_human_review: boolean;
  summary: string | null;
  suggested_action: string | null;
  strategy: Strategy;
  modelUsed: string;
  promptVersion: string;
  usage: { input: number; output: number; total: number };
  costUsd: number;
  latencyMs: number;
  dmConfidence: { category: number; priority: number; needs_human_review: number } | null;
  fellBackToLlm: boolean | null;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function Triage() {
  const [ticket, setTicket] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("llm");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, strategy, model: model || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error}:\n${data.details}` : data.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ padding: "4px 12px 4px 0", color: "#555", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: 4 }}>{value}</td>
    </tr>
  );

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <Nav />
      <h1>Support Triage</h1>
      <p>Paste the ticket: subject, empty line, body (max 5000 characters).</p>
      <textarea value={ticket} onChange={(e) => setTicket(e.target.value)} rows={12} style={{ width: "100%" }} />
      <div style={{ color: ticket.length > 5000 ? "#a51d25" : "#777", fontSize: 13 }}>{ticket.length} / 5000</div>
      <StrategyModelPicker strategy={strategy} onStrategy={setStrategy} model={model} onModel={setModel} />
      <button onClick={run} disabled={loading || !ticket.trim()}>
        {loading ? "Triaging..." : "Triage"}
      </button>

      {error && <pre role="alert" style={{ color: "#a51d25", whiteSpace: "pre-wrap" }}>{error}</pre>}

      {result && (
        <div style={{ background: "white", border: "1px solid #ccd3df", borderRadius: 12, padding: 16, marginTop: 20 }}>
          <table>
            <tbody>
              {row("Category", <b>{result.category}</b>)}
              {row("Priority", <b>{result.priority}</b>)}
              {row("Needs human review", result.needs_human_review ? "yes" : "no")}
              {row("Summary", result.summary ?? <i>— (decision models do not write text)</i>)}
              {row("Suggested action", result.suggested_action ?? <i>—</i>)}
              {result.dmConfidence &&
                row(
                  "DM confidence",
                  `category ${pct(result.dmConfidence.category)} · priority ${pct(result.dmConfidence.priority)} · review ${pct(result.dmConfidence.needs_human_review)}`
                )}
              {result.fellBackToLlm !== null && row("Fell back to LLM", result.fellBackToLlm ? "yes (DM was unsure)" : "no (DM was confident)")}
              {row("Strategy", result.strategy)}
              {row("Model used", <code>{result.modelUsed}</code>)}
              {row("Prompt version", result.promptVersion)}
              {row("Tokens", `input ${result.usage.input} · output ${result.usage.output} · total ${result.usage.total}`)}
              {row("Est. cost", `$${result.costUsd.toFixed(6)}`)}
              {row("Latency", `${result.latencyMs} ms`)}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
