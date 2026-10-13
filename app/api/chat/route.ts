import { NextResponse } from "next/server";
import { ai, MODEL } from "../../../lib/llm";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body?.messages;
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m: any) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    );
  if (!valid) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: (messages as Msg[]).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { systemInstruction: "You are a helpful assistant. Answer briefly." },
    });
    return NextResponse.json({ answer: response.text ?? "" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LLM call failed" }, { status: 502 });
  }
}