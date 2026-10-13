import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.LLM_API_KEY });
export const MODEL = process.env.LLM_MODEL!;