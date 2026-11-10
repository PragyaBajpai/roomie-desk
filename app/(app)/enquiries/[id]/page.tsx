import Link from "next/link";
import { headers } from "next/headers";
import { baseUrlFrom, customerLink } from "@/lib/url";
import { CopyField } from "@/components/copy";
import { notFound } from "next/navigation";
import { AppError, getEnquiry, getShortlist } from "@/lib/repo";
import { EnquiryForm } from "@/components/enquiry-form";
import { ShortlistEntryEditor } from "@/components/shortlist-entry";
import { Avatar, DemoBadge, ScoreRing, SourceBadge, StatusBadge, budgetText, dateText, timeAgo } from "@/components/ui";
import { saveEnquiryAction, unshortlistAction } from "@/app/actions";

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  let enquiry, shortlist;
  try {
    [enquiry, shortlist] = await Promise.all([getEnquiry(id), getShortlist(id)]);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }

  const link = customerLink(baseUrlFrom(await headers()), enquiry.access_token);

  return (
    <>
      <Link href="/enquiries" className="text-[12.5px] text-ink-500 hover:text-ink-950">← Enquiries</Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-2 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-bold">{enquiry.customer_name}</h1>
            <StatusBadge status={enquiry.status} />
            <SourceBadge source={enquiry.source} />
          </div>
          <p className="text-ink-500 mt-1 text-[13px]">
            Enquiry #{enquiry.id} · {[enquiry.locality, enquiry.city].filter(Boolean).join(", ") || "No location"} · {budgetText(enquiry.budget_min, enquiry.budget_max)} · by {dateText(enquiry.move_in_by)} · updated {timeAgo(enquiry.updated_at)}
          </p>
        </div>
        <Link href={`/matching?enquiry=${enquiry.id}`} className="btn-brand">Find matches →</Link>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-5 items-start">
        <EnquiryForm enquiry={enquiry} action={saveEnquiryAction} submitLabel="Save changes" />

        <div className="space-y-4">
        <section className="card p-5">
          <h2 className="text-[15px] font-semibold">Customer link</h2>
          <p className="text-[12.5px] text-ink-500 mt-0.5 mb-3">Send this private link to {enquiry.customer_name.replace(/^.*—\s*/, "").split(" ")[0]} (e.g. on WhatsApp). They see only their own shortlist and can accept or pass.</p>
          <CopyField value={link} />
          <a href={link} target="_blank" className="inline-block text-[12.5px] text-ink-500 hover:text-ink-950 mt-2">Preview as customer ↗</a>
        </section>

        <section className="card">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="text-[15px] font-semibold">Shortlist <span className="text-ink-400 font-normal">· {shortlist.length}</span></h2>
            <Link href={`/matching?enquiry=${enquiry.id}`} className="text-[12.5px] text-ink-500 hover:text-ink-950">Add more →</Link>
          </div>
          {shortlist.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-ink-500 text-[13px]">No one shortlisted yet.</p>
              <Link href={`/matching?enquiry=${enquiry.id}`} className="btn-outline mt-3">Open matching workspace</Link>
            </div>
          )}
          <ul>
            {shortlist.map((s) => (
              <li key={s.id} className={`px-5 py-4 border-b border-line last:border-0 ${s.status === "accepted" ? "bg-sage-50/60" : ""} ${s.matched_with ? "opacity-60" : ""}`}>
                <div className="flex gap-3">
                  <Avatar name={s.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-ink-950">{s.name}</p>
                      {s.is_demo && <DemoBadge />}
                      {s.source === "claude" && <SourceBadge source="claude" />}
                      {s.status === "accepted" && <span className="chip bg-sage-50 text-sage-700">{s.decided_by === "customer" ? "Accepted by customer" : "Confirmed by agency"}</span>}
                      {s.status === "declined" && <span className="chip bg-ink-950/5 text-ink-500">{s.decided_by === "customer" ? "Declined by customer" : "Declined (recorded by agency)"}</span>}
                      {s.matched_with && <span className="chip bg-ink-950/5 text-ink-500">Unavailable</span>}
                    </div>
                    <p className="text-[12px] text-ink-500">{s.occupation} · {s.locality}</p>
                  </div>
                  <ScoreRing score={s.score} size={44} />
                </div>
                <p className="text-[12px] text-ink-500 mt-2 leading-relaxed">{s.reason}</p>
                {s.matched_with ? (
                  <div className="mt-3 rounded-lg bg-canvas border border-line px-3 py-2 text-[12.5px] text-ink-500">
                    Matched with <b className="text-ink-700">{s.matched_with}</b> — no longer available.
                    <form action={unshortlistAction} className="inline">
                      <input type="hidden" name="enquiry_id" value={enquiry.id} />
                      <input type="hidden" name="flatmate_id" value={s.flatmate_id} />
                      <button className="ml-2 underline hover:text-brand-700">Remove</button>
                    </form>
                  </div>
                ) : (
                  <ShortlistEntryEditor key={`${s.status}-${s.decided_by}`} enquiryId={enquiry.id} flatmateId={s.flatmate_id} status={s.status} note={s.note} decidedBy={s.decided_by} />
                )}
              </li>
            ))}
          </ul>
        </section>
        </div>
      </div>
    </>
  );
}
