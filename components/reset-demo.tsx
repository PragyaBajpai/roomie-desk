"use client";
import { useState, useTransition } from "react";
import { resetDemoAction } from "@/app/actions";

export function ResetDemo() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  if (!confirming)
    return <button type="button" onClick={() => setConfirming(true)} className="text-[12px] text-ink-500 hover:text-ink-950 underline underline-offset-2 mt-2">Reset demo data</button>;
  return (
    <div className="mt-2 text-[12px]">
      <p className="text-ink-700 mb-1.5">Delete all changes and restore the original demo data?</p>
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => start(() => resetDemoAction())} className="btn-primary btn-sm">{pending ? "Resetting…" : "Yes, reset"}</button>
        <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </div>
  );
}
