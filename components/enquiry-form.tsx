"use client";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/actions";
import { ENQUIRY_STATUS, FOODS, LIFESTYLE_TAGS } from "@/lib/validation";

type E = {
  id?: number; customer_name?: string; customer_phone?: string; gender?: string | null; preferred_flatmate_gender?: string;
  occupation?: string; city?: string | null; locality?: string | null; budget_min?: number | null; budget_max?: number | null;
  move_in_by?: string | null; food?: string | null; smoking?: string | null; drinking?: string | null; lifestyle?: string[];
  notes?: string; status?: string;
};

export function EnquiryForm({ enquiry = {}, action, submitLabel }: { enquiry?: E; action: (s: FormState, fd: FormData) => Promise<FormState>; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [dirty, setDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const tags = Array.from(new Set([...LIFESTYLE_TAGS, ...(enquiry.lifestyle ?? [])]));

  useEffect(() => {
    if (state.savedAt) {
      setDirty(false);
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state.savedAt]);

  return (
    <form
      onSubmit={(ev) => {
        // Submit manually so a validation error doesn't reset the user's edits.
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => formAction(fd));
      }}
      onChange={() => setDirty(true)}
      className="card"
    >
      {enquiry.id && <input type="hidden" name="id" value={enquiry.id} />}
      <Section title="Customer">
        <Field label="Customer name" span={2}><input name="customer_name" required minLength={2} defaultValue={enquiry.customer_name} className="input" placeholder="e.g. Riya Sharma" /></Field>
        <Field label="Phone"><input name="customer_phone" defaultValue={enquiry.customer_phone} className="input" placeholder="+91" /></Field>
        <Field label="Occupation"><input name="occupation" defaultValue={enquiry.occupation} className="input" placeholder="Working professional" /></Field>
        <Field label="Gender">
          <select name="gender" defaultValue={enquiry.gender ?? ""} className="input">
            <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="non-binary">Non-binary</option>
          </select>
        </Field>
        <Field label="Wants to live with">
          <select name="preferred_flatmate_gender" defaultValue={enquiry.preferred_flatmate_gender ?? "any"} className="input">
            <option value="any">Any gender</option><option value="female">Female flatmates</option><option value="male">Male flatmates</option>
          </select>
        </Field>
        {enquiry.status && (
          <Field label="Enquiry status">
            <select key={enquiry.status} name="status" defaultValue={enquiry.status} className="input capitalize">
              {ENQUIRY_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
        )}
      </Section>

      <Section title="Requirements">
        <Field label="City"><input name="city" defaultValue={enquiry.city ?? ""} className="input" placeholder="Pune" /></Field>
        <Field label="Preferred location"><input name="locality" defaultValue={enquiry.locality ?? ""} className="input" placeholder="Hinjewadi Phase 1" /></Field>
        <Field label="Budget from (₹/month)"><input name="budget_min" inputMode="numeric" defaultValue={enquiry.budget_min ?? ""} className="input" placeholder="Optional" /></Field>
        <Field label="Budget up to (₹/month)"><input name="budget_max" inputMode="numeric" defaultValue={enquiry.budget_max ?? ""} className="input" placeholder="12000" /></Field>
        <Field label="Move in by"><input name="move_in_by" type="date" defaultValue={enquiry.move_in_by ?? ""} className="input" /></Field>
        <Field label="Food">
          <select name="food" defaultValue={enquiry.food ?? ""} className="input">
            <option value="">No preference</option>
            {FOODS.filter((f) => f !== "any").map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Smoking">
          <select name="smoking" defaultValue={enquiry.smoking ?? ""} className="input">
            <option value="">No preference</option><option value="non-smoker">Non-smokers only</option>
          </select>
        </Field>
        <Field label="Drinking">
          <select name="drinking" defaultValue={enquiry.drinking ?? ""} className="input">
            <option value="">No preference</option><option value="never">Non-drinkers only</option>
          </select>
        </Field>
      </Section>

      <Section title="Lifestyle preferences" cols={1}>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label key={t} className="cursor-pointer">
              <input type="checkbox" name="lifestyle" value={t} defaultChecked={enquiry.lifestyle?.includes(t)} className="peer sr-only" />
              <span className="inline-flex h-8 items-center rounded-full border border-line bg-white px-3 text-[12.5px] text-ink-700 transition peer-checked:border-ink-950 peer-checked:bg-ink-950 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-ink-950/10">
                {t}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} defaultValue={enquiry.notes} className="input" placeholder="Anything else worth remembering" />
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-canvas/60 rounded-b-xl2 sticky bottom-0">
        <p className="text-[12.5px] min-h-[1em]" aria-live="polite">
          {state.error ? <span className="text-brand-700">{state.error}</span>
            : showSaved ? <span className="text-sage-700 font-medium">✓ Saved to database</span>
            : dirty ? <span className="text-amber-700">Unsaved changes</span>
            : <span className="text-ink-400">{enquiry.id ? "All changes saved" : ""}</span>}
        </p>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}

function Section({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="px-5 py-5 border-b border-line last:border-0">
      <h3 className="text-[13px] font-semibold text-ink-900 mb-4">{title}</h3>
      <div className={cols === 2 ? "grid sm:grid-cols-2 gap-4" : ""}>{children}</div>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return <div className={span === 2 ? "sm:col-span-2" : ""}><label className="label">{label}</label>{children}</div>;
}
