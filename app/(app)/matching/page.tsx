import Link from "next/link";
import { countActiveFlatmates, getShortlist, listEnquiries, matchesForEnquiry } from "@/lib/repo";
import { Avatar, DemoBadge, PageHeader, ScoreRing, StatusBadge, budgetText, dateText, inr } from "@/components/ui";
import { shortlistAction, unshortlistAction } from "@/app/actions";
import { WEIGHTS } from "@/lib/matching";

export default async function MatchingPage({ searchParams }: { searchParams: Promise<{ enquiry?: string; all?: string }> }) {
  const sp = await searchParams;
  const enquiries = await listEnquiries();
  const open = enquiries.filter((e) => !["matched", "closed"].includes(e.status));
  const selectedId = Number(sp.enquiry) || open[0]?.id || enquiries[0]?.id;
  const showAll = sp.all === "1";

  if (!selectedId) {
    return (<><PageHeader title="Matching workspace" /><div className="card p-10 text-center text-ink-500">Create an enquiry to start matching. <Link className="underline" href="/enquiries/new">New enquiry</Link></div></>);
  }

  const [{ enquiry, matches }, shortlist, pool] = await Promise.all([matchesForEnquiry(selectedId, 30), getShortlist(selectedId), countActiveFlatmates()]);
  const shortlisted = new Set(shortlist.map((s) => s.flatmate_id));
  const visible = showAll ? matches : matches.filter((m) => m.match.score >= 50).slice(0, 8);
  const criteria = [
    ["Location", [enquiry.locality, enquiry.city].filter(Boolean).join(", ") || "Any"],
    ["Budget", budgetText(enquiry.budget_min, enquiry.budget_max)],
    ["Move in by", dateText(enquiry.move_in_by)],
    ["Food", enquiry.food ?? "Any"],
    ["Lives with", enquiry.preferred_flatmate_gender === "any" ? "Any gender" : `${enquiry.preferred_flatmate_gender} flatmates`],
    ["Lifestyle", [enquiry.smoking === "non-smoker" ? "non-smoker" : null, enquiry.drinking === "never" ? "non-drinker" : null, ...enquiry.lifestyle].filter(Boolean).join(", ") || "Any"],
  ];

  return (
    <>
      <PageHeader title="Matching workspace" subtitle={`Ranked from ${pool} active profiles with a deterministic score — budget ${WEIGHTS.budget}, location ${WEIGHTS.location}, move-in ${WEIGHTS.move_in}, food ${WEIGHTS.food}, lifestyle ${WEIGHTS.lifestyle}.`} />

      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        <aside className="card p-2 lg:sticky lg:top-6">
          <p className="px-2.5 pt-2 pb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-400">Open enquiries</p>
          <div className="max-h-[60vh] overflow-y-auto">
            {open.map((e) => (
              <Link key={e.id} href={`/matching?enquiry=${e.id}`}
                className={`block rounded-lg px-2.5 py-2 ${e.id === selectedId ? "bg-ink-950 text-white" : "hover:bg-canvas"}`}>
                <p className="text-[13px] font-medium truncate">{e.customer_name}</p>
                <p className={`text-[11.5px] truncate ${e.id === selectedId ? "text-white/60" : "text-ink-500"}`}>{e.locality || e.city || "No location"} · {budgetText(e.budget_min, e.budget_max)}</p>
              </Link>
            ))}
            {open.length === 0 && <p className="px-2.5 py-3 text-[12.5px] text-ink-500">No open enquiries.</p>}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-[16px] font-semibold">{enquiry.customer_name}</h2><StatusBadge status={enquiry.status} /></div>
                <p className="text-[12.5px] text-ink-500 mt-0.5">Enquiry #{enquiry.id} · {shortlist.length} shortlisted</p>
              </div>
              <Link href={`/enquiries/${enquiry.id}`} className="btn-outline btn-sm">Edit enquiry</Link>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-4">
              {criteria.map(([k, v]) => (
                <div key={k}><dt className="text-[11.5px] text-ink-400">{k}</dt><dd className="text-[13px] text-ink-900 capitalize-first">{v}</dd></div>
              ))}
            </dl>
          </section>

          <div className="flex items-center justify-between px-1">
            <p className="text-[12.5px] text-ink-500">{visible.length} {showAll ? "profiles" : "best matches"} · demo profiles are fictional</p>
            <Link href={`/matching?enquiry=${selectedId}${showAll ? "" : "&all=1"}`} className="text-[12.5px] text-ink-500 hover:text-ink-950">{showAll ? "Show best matches" : "Show all eligible"}</Link>
          </div>

          {visible.length === 0 && <div className="card p-10 text-center text-ink-500 text-[13px]">No compatible profiles yet. Try widening the budget or location on the enquiry.</div>}

          {visible.map(({ flatmate: f, match: m }, i) => {
            const isIn = shortlisted.has(f.id);
            return (
              <article key={f.id} className={`card p-5 ${isIn ? "ring-2 ring-sage-500/40" : ""}`}>
                <div className="flex gap-4">
                  <Avatar name={f.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11.5px] font-medium text-ink-400 tabular-nums">#{i + 1}</span>
                      <h3 className="text-[15px] font-semibold">{f.name}</h3>
                      {f.is_demo && <DemoBadge />}
                      {m.meets_all_criteria && <span className="chip bg-sage-50 text-sage-700">Meets all criteria</span>}
                    </div>
                    <p className="text-[12.5px] text-ink-500 mt-0.5">{f.occupation} · {f.locality}, {f.city} · {inr(f.budget_min)}–{inr(f.budget_max)} · from {dateText(f.move_in_date)}</p>
                    <p className="text-[13px] text-ink-700 mt-2 leading-relaxed">{f.intro}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {[f.food, f.smoking, f.drinking === "never" ? "non-drinker" : `drinks ${f.drinking}`, `${f.work_schedule} schedule`, ...f.lifestyle].map((t) => (
                        <span key={t} className="chip bg-canvas border border-line text-ink-700">{t}</span>
                      ))}
                    </div>
                  </div>
                  <ScoreRing score={m.score} />
                </div>

                <div className="mt-4 grid sm:grid-cols-5 gap-3 border-t border-line pt-4">
                  {m.breakdown.map((b) => (
                    <div key={b.key}>
                      <div className="flex items-baseline justify-between text-[11.5px]">
                        <span className="text-ink-500">{b.label}</span>
                        <span className="font-medium tabular-nums text-ink-900">{b.points}/{b.weight}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-canvas mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${b.points === b.weight ? "bg-sage-500" : b.points > 0 ? "bg-amber-500" : "bg-ink-300"}`} style={{ width: `${(b.points / b.weight) * 100}%` }} />
                      </div>
                      <p className="text-[11.5px] text-ink-500 mt-1.5 leading-snug">{b.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-4">
                  <form action={isIn ? unshortlistAction : shortlistAction}>
                    <input type="hidden" name="enquiry_id" value={enquiry.id} />
                    <input type="hidden" name="flatmate_id" value={f.id} />
                    {isIn
                      ? <button className="btn-outline">✓ Shortlisted · Undo</button>
                      : <button className="btn-primary">Shortlist</button>}
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
