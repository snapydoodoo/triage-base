// F4: very simple logging, one JSON object per line in logs/*.jsonl
import { promises as fs } from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
export const TRIAGE_LOG = "triage-calls.jsonl";
export const SMOKE_LOG = "smoke-runs.jsonl";

export async function appendLog(file: string, entry: object) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(path.join(LOG_DIR, file), JSON.stringify(entry) + "\n", "utf8");
}

export async function readLog<T>(file: string): Promise<T[]> {
  try {
    const text = await fs.readFile(path.join(LOG_DIR, file), "utf8");
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  } catch {
    return []; // no log yet
  }
}
