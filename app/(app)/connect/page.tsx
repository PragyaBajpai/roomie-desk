import { headers } from "next/headers";
import { CopyField } from "@/components/copy";
import { ClaudeMark, PageHeader } from "@/components/ui";

const PROMPTS = [
  "I have a new enquiry from Neha Kapoor, a female working professional looking for a flatmate in Hinjewadi Phase 1, Pune. Her budget is ₹12,000, she prefers vegetarian food and wants to move in by December 1. Create the enquiry and find her the best three matches.",
  "Shortlist all three for her and add the note “Share profiles on WhatsApp today”.",
  "What's on Neha's shortlist right now?",
  "Update Neha's budget to ₹13,000 and mark the enquiry as contacted.",
  "Show me Karan Malhotra's enquiry and suggest who else he could live with in Kharadi.",
];

export default async function ConnectPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = (process.env.APP_URL || `${proto}://${host}`).replace(/\/$/, "");
  const key = process.env.MCP_ACCESS_KEY;
  const url = key ? `${base}/api/mcp/${key}` : `${base}/api/mcp`;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Connect Claude" subtitle="Run your desk by talking to Claude. Everything it does lands here, in the same database." />

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-[#FBF1EA] text-[#C2683C]"><ClaudeMark /></span>
          <h2 className="text-[15px] font-semibold">Your MCP server</h2>
        </div>
        <CopyField label="Remote MCP URL (Streamable HTTP) — contains your access key, keep it private" value={url} />
        <ol className="mt-6 space-y-3 text-[13.5px] text-ink-700 list-decimal pl-5">
          <li>In Claude (web or desktop), open <b>Customize → Connectors</b>.</li>
          <li>Click <b>+ Add</b> → <b>Add custom connector</b>. Name it <b>Roomie Desk</b> and paste the URL above.</li>
          <li>For authentication choose <b>No sign in</b> — the access key in the URL is the credential. Click <b>Add</b>.</li>
          <li>In a new chat, make sure Roomie Desk is enabled in the tools menu, then try a prompt below. Claude will ask permission the first time each tool runs.</li>
        </ol>
        <p className="text-[12px] text-ink-400 mt-4">Prefer headers? Use <code className="text-ink-700">{base}/api/mcp</code> and add the request header <code className="text-ink-700">Authorization: Bearer &lt;key&gt;</code>. Team/Enterprise: an owner adds it under Organization settings → Connectors.</p>
      </section>

      <section className="card p-5 sm:p-6 mt-4">
        <h2 className="text-[15px] font-semibold mb-1">Try these in order</h2>
        <p className="text-[12.5px] text-ink-500 mb-4">Then refresh the Dashboard — new records show a “via Claude” badge.</p>
        <ol className="space-y-2.5">
          {PROMPTS.map((p, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-line bg-canvas/60 p-3 text-[13px] text-ink-900 leading-relaxed">
              <span className="font-display font-bold text-ink-300">{i + 1}</span><span>{p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5 sm:p-6 mt-4">
        <h2 className="text-[15px] font-semibold mb-3">Tools Claude can use</h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          {[
            ["create_enquiry", "Save a new enquiry"], ["update_enquiry", "Edit enquiry fields"], ["get_enquiry", "Read an enquiry + shortlist"],
            ["search_flatmates", "Ranked, explained matches"], ["get_flatmate_details", "Full profile + score breakdown"],
            ["shortlist_flatmate", "Save profiles to a shortlist"], ["get_shortlisted_flatmates", "Read a shortlist"], ["update_enquiry_status", "Move through the pipeline"],
          ].map(([n, d]) => (
            <div key={n} className="flex justify-between gap-3 py-1.5 border-b border-line"><code className="text-ink-950">{n}</code><span className="text-ink-500 text-right">{d}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
