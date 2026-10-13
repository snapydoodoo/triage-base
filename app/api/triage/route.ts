import { NextResponse } from "next/server";
import { triageTicket } from "../../../lib/triage";
import { PROMPT_VERSION } from "../../../lib/prompt";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticket = body?.ticket;
  if (typeof ticket !== "string" || ticket.trim() === "") {
    return NextResponse.json({ error: "Ticket must be a non-empty string" }, { status: 400 });
  }

  try {
    const result = await triageTicket(ticket);
    return NextResponse.json({ result, promptVersion: PROMPT_VERSION });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LLM call failed" }, { status: 502 });
  }
}