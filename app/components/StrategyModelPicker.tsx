"use client";
// Lets the user choose the strategy (llm / dm / dm+llm) and the LLM model (F5)
import { useEffect, useState } from "react";

export type Strategy = "llm" | "dm" | "dm+llm";

export const STRATEGY_LABELS: Record<Strategy, string> = {
  llm: "LLM only (Gemini)",
  dm: "Decision model only",
  "dm+llm": "Decision model, LLM if unsure",
};

type Props = {
  strategy: Strategy;
  onStrategy: (s: Strategy) => void;
  model: string;
  onModel: (m: string) => void;
};

export default function StrategyModelPicker({ strategy, onStrategy, model, onModel }: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [dmModel, setDmModel] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models);
        setDmModel(d.dmModel);
        if (!model) onModel(d.defaultModel);
      })
      .catch(() => setModels([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "12px 0" }}>
      <label>
        Strategy{" "}
        <select value={strategy} onChange={(e) => onStrategy(e.target.value as Strategy)}>
          {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => (
            <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label style={{ opacity: strategy === "dm" ? 0.5 : 1 }}>
        LLM model{" "}
        <select value={model} onChange={(e) => onModel(e.target.value)} disabled={strategy === "dm"}>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>
      {strategy !== "llm" && dmModel && <span style={{ color: "#555" }}>Decision model: <code>{dmModel}</code></span>}
    </div>
  );
}
