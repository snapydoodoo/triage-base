"use client";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages([...next, { role: "assistant", content: data.answer }]);
      setInput("");
    } catch (e: any) {
      setError(e.message); // old messages stay, user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Chat</h1>
      <a href="/triage">Go to triage →</a>
      <div style={{ margin: "20px 0" }}>
        {messages.map((m, i) => (
          <p key={i}><b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}</p>
        ))}
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} style={{ width: "100%" }} />
      <button onClick={send} disabled={loading || !input.trim()}>
        {loading ? "Sending..." : "Send"}
      </button>
    </main>
  );
}