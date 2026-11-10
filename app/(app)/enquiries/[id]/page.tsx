import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError, getEnquiry, getShortlist } from "@/lib/repo";
import { EnquiryForm } from "@/components/enquiry-form";
import { ShortlistEntryEditor } from "@/components/shortlist-entry";
import { Avatar, DemoBadge, ScoreRing, SourceBadge, StatusBadge, budgetText, dateText, timeAgo } from "@/components/ui";
import { saveEnquiryAction } from "@/app/actions";

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
              <li key={s.id} className="px-5 py-4 border-b border-line last:border-0">
                <div className="flex gap-3">
                  <Avatar name={s.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-ink-950">{s.name}</p>
                      {s.is_demo && <DemoBadge />}
                      {s.source === "claude" && <SourceBadge source="claude" />}
                    </div>
                    <p className="text-[12px] text-ink-500">{s.occupation} · {s.locality}</p>
                  </div>
                  <ScoreRing score={s.score} size={44} />
                </div>
                <p className="text-[12px] text-ink-500 mt-2 leading-relaxed">{s.reason}</p>
                <ShortlistEntryEditor enquiryId={enquiry.id} flatmateId={s.flatmate_id} status={s.status} note={s.note} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
