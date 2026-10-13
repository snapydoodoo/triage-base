"use client";
import { useState } from "react";

export default function Triage() {
  const [ticket, setTicket] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(`[${data.promptVersion}]\n\n${data.result}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Support Triage</h1>
      <a href="/">← Back to chat</a>
      <p>Paste the ticket: subject, empty line, body.</p>
      <textarea value={ticket} onChange={(e) => setTicket(e.target.value)} rows={12} style={{ width: "100%" }} />
      <button onClick={run} disabled={loading || !ticket.trim()}>
        {loading ? "Triaging..." : "Triage"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && <pre style={{ whiteSpace: "pre-wrap", background: "#f3f3f3", padding: 12 }}>{result}</pre>}
    </main>
  );
}