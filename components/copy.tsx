"use client";
import { useState } from "react";

export function CopyField({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="flex gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-line bg-canvas px-3 h-9 leading-9 text-[12.5px] text-ink-900">{value}</code>
        <button type="button" className="btn-outline" onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); }}>
          {done ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
