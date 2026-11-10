import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEnquiryByToken, getShortlist } from "@/lib/repo";
import { Avatar, ScoreRing, budgetText, dateText, inr } from "@/components/ui";
import { DecisionButtons } from "./decision";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your flatmate shortlist — Roomie Desk", robots: { index: false, follow: false } };

export default async function CustomerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await getEnquiryByToken(token);
  if (!enquiry) notFound();
  const shortlist = await getShortlist(enquiry.id);
  const accepted = shortlist.find((s) => s.status === "accepted");
  const first = enquiry.customer_name.replace(/^.*—\s*/, "").split(" ")[0];
  const open = enquiry.status !== "closed";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="font-display font-bold text-[15px]">Roomie Desk</span>
          <span className="ml-auto text-[12px] text-ink-400">Private link · only you can see this</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-[24px] font-bold">Hi {first}, here are your flatmate matches</h1>
        <p className="text-ink-500 mt-1.5">Your agency shortlisted these people for you. Accept the one you&apos;d like to live with — the agency will take it from there.</p>

        <section className="card p-5 mt-6">
          <h2 className="text-[13px] font-semibold mb-3">What you asked for</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-[13px]">
            <div><dt className="text-[11.5px] text-ink-400">Location</dt><dd>{[enquiry.locality, enquiry.city].filter(Boolean).join(", ") || "Any"}</dd></div>
            <div><dt className="text-[11.5px] text-ink-400">Budget</dt><dd>{budgetText(enquiry.budget_min, enquiry.budget_max)}</dd></div>
            <div><dt className="text-[11.5px] text-ink-400">Move in by</dt><dd>{dateText(enquiry.move_in_by)}</dd></div>
            <div><dt className="text-[11.5px] text-ink-400">Food</dt><dd className="capitalize">{enquiry.food ?? "Any"}</dd></div>
          </dl>
          <p className="text-[12px] text-ink-400 mt-3">Something wrong? Tell your agency and they&apos;ll update it.</p>
        </section>

        {accepted && (
          <div className="card mt-4 px-5 py-4 bg-sage-50 border-sage-500/20 text-sage-700 text-[13.5px]">
            ✓ You&apos;re matched with <b>{accepted.name}</b>
            {accepted.decided_by === "agency" ? " — confirmed by your agency on your behalf." : "."} The agency will contact you about next steps.
          </div>
        )}
        {!open && <div className="card mt-4 px-5 py-4 text-[13.5px] text-ink-500">This enquiry is closed. Please contact your agency if you still need help.</div>}

        <p className="text-[12px] text-ink-400 mt-6 mb-2">These are fictional demo profiles for this product demo — not real people.</p>

        <div className="space-y-3">
          {shortlist.length === 0 && <div className="card p-10 text-center text-ink-500 text-[13px]">Your agency hasn&apos;t shortlisted anyone yet. Check back soon.</div>}
          {shortlist.map((s) => {
            const isAccepted = s.status === "accepted";
            const declined = s.status === "declined";
            const unavailable = !!s.matched_with;
            const canDecide = open && !accepted && !unavailable;
            return (
              <article key={s.id} className={`card p-5 ${isAccepted ? "ring-2 ring-sage-500/40" : ""} ${unavailable || (declined && !canDecide) ? "opacity-60" : ""}`}>
                <div className="flex gap-4">
                  <Avatar name={s.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-[15px] font-semibold">{s.name}</h3>
                      {isAccepted && <span className="chip bg-sage-50 text-sage-700">Your match</span>}
                      {declined && <span className="chip bg-ink-950/5 text-ink-500">You passed</span>}
                      {unavailable && <span className="chip bg-ink-950/5 text-ink-500">No longer available</span>}
                    </div>
                    <p className="text-[12.5px] text-ink-500 mt-0.5">{s.occupation} · {s.locality}, {s.city} · {inr(s.budget_min)}–{inr(s.budget_max)} · from {dateText(s.move_in_date)}</p>
                    <p className="text-[13px] text-ink-700 mt-2 leading-relaxed">{s.intro}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {[s.food, ...s.lifestyle].map((t) => <span key={t} className="chip bg-canvas border border-line text-ink-700">{t}</span>)}
                    </div>
                  </div>
                  <ScoreRing score={s.score} />
                </div>
                <p className="text-[12px] text-ink-500 mt-3 leading-relaxed border-t border-line pt-3">{s.reason}</p>
                {canDecide && !isAccepted && <div className="mt-3"><DecisionButtons token={token} flatmateId={s.flatmate_id} name={s.name} declined={declined} /></div>}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
