import { NextResponse } from "next/server";
import { availableModels, DEFAULT_MODEL } from "../../../lib/models";
import { DM_MODEL } from "../../../lib/dm";

export async function GET() {
  return NextResponse.json({ models: availableModels(), defaultModel: DEFAULT_MODEL, dmModel: DM_MODEL });
}
