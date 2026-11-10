import Link from "next/link";
import { dashboard, listEnquiries } from "@/lib/repo";
import { ClaudeMark, PageHeader, SourceBadge, StatusBadge, budgetText, timeAgo } from "@/components/ui";
import { ENQUIRY_STATUS } from "@/lib/validation";

export default async function DashboardPage() {
  const [d, enquiries] = await Promise.all([dashboard(), listEnquiries()]);
  const stats = [
    { label: "Total enquiries", value: d.total, hint: `${d.via_claude} created via Claude`, href: "/enquiries" },
    { label: "Pending enquiries", value: d.pending, hint: "Not yet matched or closed", href: "/enquiries?status=pending" },
    { label: "Active flatmate profiles", value: d.flatmates, hint: "Available for matching", href: "/matching" },
    { label: "Shortlisted matches", value: d.shortlisted, hint: "Across all enquiries", href: "/enquiries" },
  ];
  const counts = Object.fromEntries(d.byStatus.map((s) => [s.status, s.n]));
  const max = Math.max(1, ...d.byStatus.map((s) => s.n));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your enquiry pipeline at a glance."
        actions={<><Link href="/connect" className="btn-outline"><ClaudeMark className="h-3.5 w-3.5 text-[#C2683C]" />Connect Claude</Link><Link href="/enquiries/new" className="btn-primary">New enquiry</Link></>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 sm:p-5 hover:shadow-lift transition-shadow">
            <p className="text-[12.5px] text-ink-500">{s.label}</p>
            <p className="font-display text-[30px] font-bold text-ink-950 mt-1 leading-none">{s.value}</p>
            <p className="text-[11.5px] text-ink-400 mt-2">{s.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mt-4">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-[15px] font-semibold">Recent enquiries</h2>
            <Link href="/enquiries" className="text-[12.5px] text-ink-500 hover:text-ink-950">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <tbody>
                {enquiries.slice(0, 6).map((e) => (
                  <tr key={e.id} className="hover:bg-canvas">
                    <td className="td">
                      <Link href={`/enquiries/${e.id}`} className="font-medium text-ink-950 hover:underline">{e.customer_name}</Link>
                      <p className="text-[12px] text-ink-500">{[e.locality, e.city].filter(Boolean).join(", ") || "Location not set"}</p>
                    </td>
                    <td className="td text-ink-700">{budgetText(e.budget_min, e.budget_max)}</td>
                    <td className="td"><StatusBadge status={e.status} /></td>
                    <td className="td text-right"><SourceBadge source={e.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[15px] font-semibold mb-4">Pipeline</h2>
            <div className="space-y-2.5">
              {ENQUIRY_STATUS.map((s) => (
                <div key={s} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-20 capitalize text-ink-500">{s}</span>
                  <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
                    <div className="h-full rounded-full bg-ink-950" style={{ width: `${((counts[s] ?? 0) / max) * 100}%`, opacity: counts[s] ? 0.85 : 0 }} />
                  </div>
                  <span className="w-5 text-right font-medium tabular-nums">{counts[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-[15px] font-semibold mb-3">Activity</h2>
            <ol className="space-y-3">
              {d.activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-[13px]">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${a.source === "claude" ? "bg-[#C2683C]" : "bg-ink-300"}`} />
                  <div className="min-w-0">
                    <p className="text-ink-900 leading-snug">
                      {a.enquiry_id ? <Link href={`/enquiries/${a.enquiry_id}`} className="hover:underline">{a.message}</Link> : a.message}
                    </p>
                    <p className="text-[11.5px] text-ink-400 mt-0.5">{a.source === "claude" ? "via Claude · " : ""}{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
