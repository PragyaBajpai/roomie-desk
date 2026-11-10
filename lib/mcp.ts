import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AppError, createEnquiry, enquiryCriteria, getEnquiry, getFlatmate, getShortlist, otherShortlists, searchFlatmates,
  shortlistFlatmates, updateEnquiry, updateEnquiryStatus, type Enquiry,
} from "./repo";
import { scoreFlatmate, type Flatmate } from "./matching";
import { ENQUIRY_STATUS, FOODS, GENDERS, PREF_GENDERS, isoDate } from "./validation";

const DEMO_NOTE = "Fictional demo profile — not a real or verified person.";

function ok(data: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

function fail(e: unknown) {
  const msg = e instanceof AppError ? e.message : e instanceof Error ? `Unexpected error: ${e.message}` : "Unexpected error";
  console.error("[mcp]", e);
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }], isError: true };
}

const run = <A,>(fn: (a: A) => Promise<Record<string, unknown>>) => async (a: A) => {
  try { return ok(await fn(a)); } catch (e) { return fail(e); }
};

const inr = (n: number | null) => (n == null ? null : "₹" + n.toLocaleString("en-IN"));

function enquiryView(e: Enquiry, base: string) {
  return {
    id: e.id,
    customer_name: e.customer_name,
    customer_phone: e.customer_phone || null,
    status: e.status,
    gender: e.gender,
    preferred_flatmate_gender: e.preferred_flatmate_gender,
    occupation: e.occupation || null,
    city: e.city,
    locality: e.locality,
    budget: { min: e.budget_min, max: e.budget_max },
    move_in_by: e.move_in_by,
    food: e.food ?? "any",
    smoking: e.smoking ?? "any",
    drinking: e.drinking ?? "any",
    lifestyle: e.lifestyle,
    notes: e.notes,
    is_demo: e.is_demo,
    created_via: e.source,
    updated_at: e.updated_at,
    open_in_roomie_desk: `${base}/enquiries/${e.id}`,
    customer_link: `${base}/c/${e.access_token}`,
    customer_link_note: "Private link for the customer: they see only their own shortlist and can accept or pass. Share it with the customer, not publicly.",
  };
}

function flatmateView(f: Flatmate) {
  return {
    id: f.id,
    name: f.name,
    label: f.is_demo ? DEMO_NOTE : undefined,
    gender: f.gender,
    prefers_flatmate_gender: f.preferred_gender,
    occupation: f.occupation,
    city: f.city,
    locality: f.locality,
    budget: `${inr(f.budget_min)}–${inr(f.budget_max)}`,
    move_in_date: f.move_in_date,
    food: f.food,
    smoking: f.smoking,
    drinking: f.drinking,
    work_schedule: f.work_schedule,
    lifestyle: f.lifestyle,
    intro: f.intro,
    availability: f.status === "active" ? "available" : f.status === "matched" ? "matched (no longer available)" : "inactive",
  };
}

const optStr = (d: string) => z.string().optional().describe(d);

const enquiryShape = {
  customer_name: z.string().min(2).describe("Name of the person making the enquiry"),
  customer_phone: optStr("Phone number, if given"),
  gender: z.enum(GENDERS).optional().describe("Gender of the person enquiring"),
  preferred_flatmate_gender: z.enum(PREF_GENDERS).optional().describe("Gender they want to live with. Defaults to the seeker's own gender (female/male) if omitted."),
  occupation: optStr("e.g. 'Working professional', 'Student'"),
  city: optStr("City, e.g. 'Pune'"),
  locality: optStr("Preferred locality, e.g. 'Hinjewadi Phase 1'"),
  budget_min: z.number().int().min(0).optional().describe("Minimum monthly budget in INR (omit if only a single budget figure is given)"),
  budget_max: z.number().int().min(0).optional().describe("Maximum monthly budget in INR. A single stated budget like '₹12,000' goes here."),
  move_in_by: isoDate.optional().describe("Latest move-in date, YYYY-MM-DD"),
  food: z.enum(FOODS).optional().describe("Food preference for the household"),
  smoking: z.enum(["non-smoker", "any"]).optional(),
  drinking: z.enum(["never", "any"]).optional(),
  lifestyle: z.array(z.string()).optional().describe("Lifestyle tags, e.g. quiet, tidy, early-riser, night-owl, social, fitness, pet-friendly"),
  notes: optStr("Any other context"),
};

export function buildMcpServer(baseUrl: string) {
  const server = new McpServer(
    { name: "roomie-desk", version: "1.0.0" },
    {
      instructions:
        "Roomie Desk is the enquiry and flatmate-matching back office of a co-living agency. Typical flow: create_enquiry → search_flatmates (pass enquiry_id) → present the top matches with their score breakdown → shortlist_flatmate. Each enquiry has a private customer_link: share it so the customer can accept or pass on their shortlist themselves. Only if the customer explicitly confirmed to the agency, call update_enquiry_status with status 'matched' and matched_flatmate_id (recorded as 'confirmed by agency'). All flatmate profiles in this workspace are fictional demo data; say so when presenting them. Scores are deterministic (budget 30, location 25, move-in 20, food 10, lifestyle 15).",
    },
  );

  server.registerTool(
    "create_enquiry",
    {
      title: "Create enquiry",
      description: "Save a new customer enquiry (someone looking for a flatmate) to the Roomie Desk database. Returns the enquiry with its id and a link to open it in the app.",
      inputSchema: enquiryShape,
    },
    run(async (a) => {
      const e = await createEnquiry(a, "claude");
      return { message: `Enquiry #${e.id} created for ${e.customer_name}.`, enquiry: enquiryView(e, baseUrl) };
    }),
  );

  server.registerTool(
    "update_enquiry",
    {
      title: "Update enquiry",
      description: "Edit fields on an existing enquiry (budget, location, move-in date, preferences, notes…). Only the fields you pass are changed. Shortlist scores are recalculated.",
      inputSchema: { enquiry_id: z.number().int().positive(), ...Object.fromEntries(Object.entries(enquiryShape).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])) },
    },
    run(async ({ enquiry_id, ...patch }: { enquiry_id: number } & Record<string, unknown>) => {
      const e = await updateEnquiry(enquiry_id, patch, "claude");
      return { message: `Enquiry #${e.id} updated.`, enquiry: enquiryView(e, baseUrl) };
    }),
  );

  server.registerTool(
    "get_enquiry",
    {
      title: "Get enquiry",
      description: "Fetch one enquiry with its current shortlist.",
      inputSchema: { enquiry_id: z.number().int().positive() },
      annotations: { readOnlyHint: true },
    },
    run(async ({ enquiry_id }) => {
      const e = await getEnquiry(enquiry_id);
      const s = await getShortlist(enquiry_id);
      return { enquiry: enquiryView(e, baseUrl), shortlist: s.map((r) => ({ flatmate_id: r.flatmate_id, name: r.name, score: r.score, status: r.status, decided_by: r.decided_by, note: r.note })) };
    }),
  );

  server.registerTool(
    "search_flatmates",
    {
      title: "Search flatmates",
      description:
        "Find compatible flatmate profiles in the database. Pass enquiry_id to use that enquiry's saved criteria (recommended), or pass criteria directly. Hard filters: active profiles, flatmate gender, city, and mutual gender preference. Results are ranked by a deterministic 0–100 compatibility score with a per-criterion explanation. strict=true returns only profiles meeting every budget/location/move-in/food criterion.",
      inputSchema: {
        enquiry_id: z.number().int().positive().optional(),
        gender: z.enum(GENDERS).optional().describe("Flatmate's gender"),
        seeker_gender: z.enum(GENDERS).optional().describe("Gender of the person searching (flatmates who only accept another gender are excluded)"),
        city: z.string().optional(),
        locality: z.string().optional(),
        budget_min: z.number().int().min(0).optional(),
        budget_max: z.number().int().min(0).optional(),
        move_in_by: isoDate.optional(),
        food: z.enum(FOODS).optional(),
        smoking: z.enum(["non-smoker"]).optional(),
        drinking: z.enum(["never"]).optional(),
        lifestyle: z.array(z.string()).optional(),
        strict: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(20).optional().default(5),
      },
      annotations: { readOnlyHint: true },
    },
    run(async (a) => {
      const { enquiry_id, strict, limit, seeker_gender, ...direct } = a;
      let criteria: Parameters<typeof searchFlatmates>[0];
      let enquiry: ReturnType<typeof enquiryView> | null = null;
      if (enquiry_id) {
        const e = await getEnquiry(enquiry_id);
        enquiry = enquiryView(e, baseUrl);
        criteria = { ...enquiryCriteria(e), ...Object.fromEntries(Object.entries(direct).filter(([, v]) => v !== undefined)) };
      } else {
        criteria = { ...direct, seekerGender: seeker_gender ?? null };
      }
      const results = await searchFlatmates(criteria, { strict, limit });
      const overlap = await otherShortlists(results.map((r) => r.flatmate.id), enquiry_id);
      return {
        criteria_used: criteria,
        enquiry,
        total_results: results.length,
        results: results.map(({ flatmate, match }) => ({
          ...flatmateView(flatmate),
          compatibility_score: match.score,
          meets_all_criteria: match.meets_all_criteria,
          why: match.breakdown.map((b) => `${b.label} ${b.points}/${b.weight}: ${b.detail}`),
          also_shortlisted_for: (overlap.get(flatmate.id) ?? []).map((o) => `${o.customer_name} (enquiry #${o.enquiry_id})`),
        })),
        note: "Only available (unmatched) profiles are returned. A profile can sit on several shortlists until one enquiry accepts it.",
        next_step: results.length ? "Call shortlist_flatmate with the enquiry_id and chosen flatmate_ids to save them." : "No matches — try strict=false or widen locality/budget.",
      };
    }),
  );

  server.registerTool(
    "get_flatmate_details",
    {
      title: "Get flatmate details",
      description: "Full profile for one flatmate. Pass enquiry_id to also get this flatmate's compatibility breakdown against that enquiry.",
      inputSchema: { flatmate_id: z.number().int().positive(), enquiry_id: z.number().int().positive().optional() },
      annotations: { readOnlyHint: true },
    },
    run(async ({ flatmate_id, enquiry_id }) => {
      const f = await getFlatmate(flatmate_id);
      const others = await otherShortlists([f.id], enquiry_id);
      const out: Record<string, unknown> = { flatmate: flatmateView(f), shortlisted_for_other_enquiries: (others.get(f.id) ?? []).map((o) => `${o.customer_name} (enquiry #${o.enquiry_id})`) };
      if (enquiry_id) {
        const m = scoreFlatmate(f, enquiryCriteria(await getEnquiry(enquiry_id)));
        out.compatibility = { score: m.score, meets_all_criteria: m.meets_all_criteria, breakdown: m.breakdown };
      }
      return out;
    }),
  );

  server.registerTool(
    "shortlist_flatmate",
    {
      title: "Shortlist flatmates",
      description: "Save one or more flatmates to an enquiry's shortlist. Score and reason are calculated and stored. Re-shortlisting the same person updates rather than duplicates. Moves a 'new'/'matching' enquiry to 'shortlisted'.",
      inputSchema: {
        enquiry_id: z.number().int().positive(),
        flatmate_ids: z.array(z.number().int().positive()).min(1).max(20),
        note: z.string().max(500).optional().describe("Optional note saved on each shortlist entry"),
      },
    },
    run(async ({ enquiry_id, flatmate_ids, note }) => {
      const saved = await shortlistFlatmates(enquiry_id, flatmate_ids, "claude", note ?? "");
      return { message: `${saved.length} profile(s) on enquiry #${enquiry_id}'s shortlist.`, saved, open_in_roomie_desk: `${baseUrl}/enquiries/${enquiry_id}` };
    }),
  );

  server.registerTool(
    "get_shortlisted_flatmates",
    {
      title: "Get shortlisted flatmates",
      description: "List the flatmates shortlisted for an enquiry, with stored scores, reasons, notes and follow-up status.",
      inputSchema: { enquiry_id: z.number().int().positive() },
      annotations: { readOnlyHint: true },
    },
    run(async ({ enquiry_id }) => {
      const rows = await getShortlist(enquiry_id);
      return {
        enquiry_id,
        count: rows.length,
        shortlist: rows.map((r) => ({
          flatmate_id: r.flatmate_id, name: r.name, label: r.is_demo ? DEMO_NOTE : undefined, occupation: r.occupation,
          locality: r.locality, city: r.city, budget: `${inr(r.budget_min)}–${inr(r.budget_max)}`, move_in_date: r.move_in_date,
          food: r.food, score: r.score, reason: r.reason, status: r.status, note: r.note, added_via: r.source,
          decided_by: r.decided_by === "customer" ? "customer (via private link)" : r.decided_by === "agency" ? "agency on the customer's behalf" : null,
          availability: r.status === "accepted" ? "matched with this enquiry" : r.matched_with ? `unavailable — matched with ${r.matched_with}` : "available",
        })),
      };
    }),
  );

  server.registerTool(
    "update_enquiry_status",
    {
      title: "Update enquiry status",
      description: `Move an enquiry through the pipeline. Statuses: ${ENQUIRY_STATUS.join(" → ")}. Optional note is appended to the enquiry notes. Customers normally accept matches themselves through their private customer_link. Only if the customer has explicitly confirmed to the agency, use status 'matched' with matched_flatmate_id — this is recorded as 'confirmed by agency'; the flatmate is marked matched and removed from every other enquiry's search results. Moving a matched enquiry back to another status releases the flatmate again.`,
      inputSchema: {
        enquiry_id: z.number().int().positive(),
        status: z.enum(ENQUIRY_STATUS),
        note: z.string().max(500).optional(),
        matched_flatmate_id: z.number().int().positive().optional().describe("With status 'matched': the flatmate the customer is moving in with"),
      },
    },
    run(async ({ enquiry_id, status, note, matched_flatmate_id }) => {
      const e = await updateEnquiryStatus(enquiry_id, status, "claude", note, matched_flatmate_id);
      return { message: `Enquiry #${e.id} is now '${e.status}'.`, enquiry: enquiryView(e, baseUrl) };
    }),
  );

  return server;
}
