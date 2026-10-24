// F4: lists every logged smoke test run (and recent single triage calls) with the model used
import Nav from "../components/Nav";
import CompareRuns, { type Run } from "./CompareRuns";
import { readLog, SMOKE_LOG, TRIAGE_LOG } from "../../lib/logs";

export const dynamic = "force-dynamic";

type Call = {
  at: string;
  strategy: string;
  modelUsed: string;
  category: string;
  priority: string;
  fellBackToLlm: boolean | null;
  usage: { total: number };
  costUsd: number;
  latencyMs: number;
};

const cell = { padding: "4px 8px", borderBottom: "1px solid #e3e7ee", fontSize: 13, whiteSpace: "nowrap" } as const;

export default async function Admin() {
  const runs = (await readLog<Run>(SMOKE_LOG)).reverse();
  const calls = (await readLog<Call>(TRIAGE_LOG)).reverse().slice(0, 30);
  const v = (x: unknown) => (x === null || x === undefined ? "—" : String(x));

  return (
    <main style={{ maxWidth: 1300, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <Nav />
      <h1>Admin</h1>

      <h2>Smoke test runs ({runs.length})</h2>
      {runs.length === 0 ? (
        <p>No runs yet. Start one from the <a href="/smoke">smoke test page</a>.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", background: "white" }}>
            <thead>
              <tr>
                {["Date", "Dataset", "Strategy", "Model", "N", "OK / rejected / errors", "Category acc.", "Priority acc.", "Both", "Cat. mismatches", "Prio. mismatches", "LLM fallbacks", "Avg latency", "p50", "Tokens", "Est. cost"].map((h) => (
                  <th key={h} style={{ ...cell, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td style={cell}>{new Date(r.at).toLocaleString()}</td>
                  <td style={cell}>{r.dataset}</td>
                  <td style={cell}>{r.strategy}</td>
                  <td style={cell}><code>{r.model}</code></td>
                  <td style={cell}>{r.sampleSize}</td>
                  <td style={cell}>{r.outcomes.ok} / {r.outcomes.rejected} / {r.outcomes.error}</td>
                  <td style={cell}>{r.categoryAccuracy === null ? "—" : `${r.categoryAccuracy}%`}</td>
                  <td style={cell}>{r.priorityAccuracy === null ? "—" : `${r.priorityAccuracy}%`}</td>
                  <td style={cell}>{r.bothCorrectAccuracy === null ? "—" : `${r.bothCorrectAccuracy}%`}</td>
                  <td style={cell}>{v(r.categoryMismatches)}</td>
                  <td style={cell}>{v(r.priorityMismatches)}</td>
                  <td style={cell}>{v(r.dmFallbacks)}</td>
                  <td style={cell}>{r.avgLatencyMs} ms</td>
                  <td style={cell}>{r.p50LatencyMs} ms</td>
                  <td style={cell}>{r.totalTokens}</td>
                  <td style={cell}>${r.costUsd.toFixed(5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {runs.length >= 2 && <CompareRuns runs={runs} />}

      <h2>Recent single triage calls</h2>
      {calls.length === 0 ? (
        <p>No triage calls logged yet.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr>
              {["Date", "Strategy", "Model used", "Category", "Priority", "Fallback", "Tokens", "Est. cost", "Latency"].map((h) => (
                <th key={h} style={{ ...cell, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((c, i) => (
              <tr key={i}>
                <td style={cell}>{new Date(c.at).toLocaleString()}</td>
                <td style={cell}>{c.strategy}</td>
                <td style={cell}><code>{c.modelUsed}</code></td>
                <td style={cell}>{c.category}</td>
                <td style={cell}>{c.priority}</td>
                <td style={cell}>{c.fellBackToLlm === null ? "—" : c.fellBackToLlm ? "yes" : "no"}</td>
                <td style={cell}>{c.usage.total}</td>
                <td style={cell}>${c.costUsd.toFixed(6)}</td>
                <td style={cell}>{c.latencyMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
