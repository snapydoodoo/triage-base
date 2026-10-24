import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.LLM_API_KEY,
  // Optional: only needed for a proxy / gateway. Leave LLM_BASE_URL empty for Gemini.
  ...(process.env.LLM_BASE_URL ? { httpOptions: { baseUrl: process.env.LLM_BASE_URL } } : {}),
});
export const MODEL = process.env.LLM_MODEL || "gemini-flash-latest";
