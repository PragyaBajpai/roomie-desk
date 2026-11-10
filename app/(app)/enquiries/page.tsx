import Link from "next/link";
import { listEnquiries } from "@/lib/repo";
import { PageHeader, SourceBadge, StatusBadge, budgetText, dateText, timeAgo } from "@/components/ui";

const TABS = [
  { key: "", label: "All" }, { key: "pending", label: "Pending" }, { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" }, { key: "contacted", label: "Contacted" }, { key: "matched", label: "Matched" }, { key: "closed", label: "Closed" },
];

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const rows = await listEnquiries(status || undefined);
  return (
    <>
      <PageHeader title="Enquiries" subtitle="Everyone looking for a flatmate, wherever they came in from." actions={<Link href="/enquiries/new" className="btn-primary">New enquiry</Link>} />
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key ? `/enquiries?status=${t.key}` : "/enquiries"}
            className={`h-8 px-3 inline-flex items-center rounded-lg text-[12.5px] font-medium whitespace-nowrap ${status === t.key ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-ink-950/5"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-canvas/70">
              <tr><th className="th">Customer</th><th className="th">Location</th><th className="th">Budget</th><th className="th">Move in by</th><th className="th">Status</th><th className="th">Shortlist</th><th className="th">Source</th><th className="th text-right">Updated</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-canvas group">
                  <td className="td">
                    <Link href={`/enquiries/${e.id}`} className="font-medium text-ink-950 group-hover:underline">{e.customer_name}</Link>
                    <p className="text-[12px] text-ink-500">#{e.id}{e.occupation ? ` · ${e.occupation}` : ""}</p>
                  </td>
                  <td className="td text-ink-700">{[e.locality, e.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className="td text-ink-700 tabular-nums">{budgetText(e.budget_min, e.budget_max)}</td>
                  <td className="td text-ink-700">{dateText(e.move_in_by)}</td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td text-ink-700 tabular-nums">{e.shortlist_count ? `${e.shortlist_count} profile${e.shortlist_count > 1 ? "s" : ""}` : "—"}</td>
                  <td className="td"><SourceBadge source={e.source} /></td>
                  <td className="td text-right text-[12.5px] text-ink-400">{timeAgo(e.updated_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="td text-center text-ink-500 py-14">No enquiries here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
