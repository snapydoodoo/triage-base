import { promises as fs } from "fs";
import path from "path";

export type Ticket = {
  ticket_id: string;
  subject: string;
  body: string;
  category?: string;
  priority?: string;
  needs_human_review?: boolean;
  tags?: string;
};

const FILES = {
  labelled100: "support_tickets_100_labelled.json",
  tickets500: "support_tickets_500.json",
} as const;

export async function loadDataset(name: keyof typeof FILES): Promise<Ticket[]> {
  const text = await fs.readFile(path.join(process.cwd(), "data", FILES[name]), "utf8");
  return JSON.parse(text);
}

/** Same format as the triage page: subject, empty line, body */
export function ticketText(t: Ticket): string {
  return t.subject ? `${t.subject}\n\n${t.body}` : t.body;
}

/** Random sample without repetition (Fisher-Yates shuffle) */
export function sample<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
