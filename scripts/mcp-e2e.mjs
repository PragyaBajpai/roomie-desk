// End-to-end check of the Roomie Desk MCP server using the official MCP SDK client.
// Usage: node scripts/mcp-e2e.mjs https://<your-app>/api/mcp/<MCP_ACCESS_KEY>
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2];
if (!url) { console.error("Pass the MCP URL"); process.exit(1); }

const client = new Client({ name: "roomie-e2e", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(`${name} failed: ${r.content[0].text}`);
  return r.structuredContent;
};
const ok = (label) => console.log("  ✓", label);

const tools = (await client.listTools()).tools.map((t) => t.name);
console.log("Tools:", tools.join(", "));
const expected = ["create_enquiry", "update_enquiry", "get_enquiry", "search_flatmates", "get_flatmate_details", "shortlist_flatmate", "get_shortlisted_flatmates", "update_enquiry_status"];
for (const t of expected) if (!tools.includes(t)) throw new Error("missing tool " + t);
ok("all 8 tools exposed");

// "I have a new enquiry from a female working professional looking for a flatmate in Hinjewadi Phase 1,
//  Pune. Her budget is ₹12,000, she prefers vegetarian food and wants to move in by December 1."
const { enquiry } = await call("create_enquiry", {
  customer_name: "E2E Test — Neha Kapoor", gender: "female", occupation: "Working professional", city: "Pune",
  locality: "Hinjewadi Phase 1", budget_max: 12000, move_in_by: "2026-12-01", food: "vegetarian",
});
ok(`create_enquiry → #${enquiry.id} (${enquiry.open_in_roomie_desk})`);

const search = await call("search_flatmates", { enquiry_id: enquiry.id, limit: 3 });
console.log("  Top 3:");
for (const r of search.results) console.log(`    ${r.compatibility_score}  ${r.name} (#${r.id}) — ${r.locality}, ${r.budget}, ${r.food}, from ${r.move_in_date}`);
if (search.results.length !== 3) throw new Error("expected 3 results");
if (search.results.some((r) => r.gender !== "female")) throw new Error("gender filter broken");
ok("search_flatmates returns 3 explained, female-only matches");
console.log("    why #1:", search.results[0].why.join(" | "));

const details = await call("get_flatmate_details", { flatmate_id: search.results[0].id, enquiry_id: enquiry.id });
ok(`get_flatmate_details → score ${details.compatibility.score}`);

const ids = search.results.map((r) => r.id);
const sl = await call("shortlist_flatmate", { enquiry_id: enquiry.id, flatmate_ids: ids, note: "Share on WhatsApp" });
ok(`shortlist_flatmate saved ${sl.saved.length}`);
const again = await call("shortlist_flatmate", { enquiry_id: enquiry.id, flatmate_ids: [ids[0]] });
if (!again.saved[0].already_shortlisted) throw new Error("duplicate shortlist not detected");
ok("re-shortlisting is idempotent");

const got = await call("get_shortlisted_flatmates", { enquiry_id: enquiry.id });
if (got.count !== 3) throw new Error("shortlist count " + got.count);
ok("get_shortlisted_flatmates → 3");

const upd = await call("update_enquiry", { enquiry_id: enquiry.id, budget_max: 13000, customer_phone: "+91 90000 00999" });
if (upd.enquiry.budget.max !== 13000) throw new Error("update failed");
ok("update_enquiry budget → 13000");

const st = await call("update_enquiry_status", { enquiry_id: enquiry.id, status: "contacted", note: "Called on WhatsApp" });
if (st.enquiry.status !== "contacted") throw new Error("status failed");
ok("update_enquiry_status → contacted");

const ge = await call("get_enquiry", { enquiry_id: enquiry.id });
ok(`get_enquiry → status ${ge.enquiry.status}, ${ge.shortlist.length} shortlisted`);

// Matching takes a flatmate out of the pool for everyone else
const second = (await call("create_enquiry", {
  customer_name: "E2E Test — Second seeker", gender: "female", city: "Pune", locality: "Hinjewadi Phase 1",
  budget_max: 12000, move_in_by: "2026-12-01", food: "vegetarian",
})).enquiry;
const before = await call("search_flatmates", { enquiry_id: second.id, limit: 10 });
const overlapRow = before.results.find((r) => r.id === ids[1]);
if (!overlapRow?.also_shortlisted_for.some((x) => x.includes(`#${enquiry.id}`))) throw new Error("overlap not reported");
ok("search shows a profile is also shortlisted for another enquiry");
const matched = await call("update_enquiry_status", { enquiry_id: enquiry.id, status: "matched", matched_flatmate_id: ids[0], note: "Moving in together" });
if (matched.enquiry.status !== "matched") throw new Error("match failed");
const sl2 = await call("get_shortlisted_flatmates", { enquiry_id: enquiry.id });
if (sl2.shortlist.find((r) => r.flatmate_id === ids[0]).status !== "accepted") throw new Error("not accepted");
ok(`matched enquiry with flatmate #${ids[0]}`);
const after = await call("search_flatmates", { enquiry_id: second.id, limit: 10 });
if (after.results.some((r) => r.id === ids[0])) throw new Error("matched flatmate still in other results");
ok("matched flatmate no longer appears for other enquiries");
const blocked = await client.callTool({ name: "shortlist_flatmate", arguments: { enquiry_id: second.id, flatmate_ids: [ids[0]] } });
if (!blocked.isError) throw new Error("should block shortlisting a matched flatmate");
ok("shortlisting a matched flatmate is refused: " + JSON.parse(blocked.content[0].text).error);
await call("update_enquiry_status", { enquiry_id: enquiry.id, status: "contacted" });
const released = await call("search_flatmates", { enquiry_id: second.id, limit: 10 });
if (!released.results.some((r) => r.id === ids[0])) throw new Error("not released");
ok("un-matching the enquiry releases the flatmate again");
await call("update_enquiry_status", { enquiry_id: second.id, status: "closed", note: "test cleanup" });

// Validation / error handling
const bad = await client.callTool({ name: "create_enquiry", arguments: { customer_name: "X", budget_min: 20000, budget_max: 1000 } });
if (!bad.isError) throw new Error("validation should fail");
ok("invalid input rejected: " + bad.content[0].text);
const missing = await client.callTool({ name: "get_enquiry", arguments: { enquiry_id: 999999 } });
if (!missing.isError) throw new Error("not-found should fail");
ok("unknown id handled: " + missing.content[0].text);

await client.close();
console.log(`\nPASS — open ${enquiry.open_in_roomie_desk} to see it in the app.`);
