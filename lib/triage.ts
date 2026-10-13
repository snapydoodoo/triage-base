import { ai, MODEL } from "./llm";
import { TRIAGE_SYSTEM_PROMPT, buildUserMessage } from "./prompt";

export async function triageTicket(ticket: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserMessage(ticket),
    config: { systemInstruction: TRIAGE_SYSTEM_PROMPT },
  });
  return response.text ?? "";
}