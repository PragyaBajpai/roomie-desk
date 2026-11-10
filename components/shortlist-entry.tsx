"use client";
import { useActionState, useEffect, useState } from "react";
import { shortlistEntryAction, unshortlistAction, type FormState } from "@/app/actions";
import { SHORTLIST_STATUS } from "@/lib/validation";

export function ShortlistEntryEditor({ enquiryId, flatmateId, status, note }: { enquiryId: number; flatmateId: number; status: string; note: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(shortlistEntryAction, {});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!state.savedAt) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [state.savedAt]);
  return (
    <div className="mt-3 space-y-2">
      <form action={action} className="flex flex-wrap gap-2 items-center">
        <input type="hidden" name="enquiry_id" value={enquiryId} />
        <input type="hidden" name="flatmate_id" value={flatmateId} />
        <select name="status" defaultValue={status} className="input h-8 w-auto text-[12.5px]">
          {SHORTLIST_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input name="note" defaultValue={note} placeholder="Add a follow-up note" className="input h-8 flex-1 min-w-[140px] text-[12.5px]" />
        <button className="btn-outline btn-sm" disabled={pending}>{pending ? "Saving…" : saved ? "✓ Saved" : "Save"}</button>
      </form>
      {state.error && <p className="text-[12px] text-brand-700">{state.error}</p>}
      <form action={unshortlistAction}>
        <input type="hidden" name="enquiry_id" value={enquiryId} />
        <input type="hidden" name="flatmate_id" value={flatmateId} />
        <button className="text-[12px] text-ink-400 hover:text-brand-700">Remove from shortlist</button>
      </form>
    </div>
  );
}
