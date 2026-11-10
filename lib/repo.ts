import { z } from "zod";
import { q, q1, ensureReady, newToken } from "./db";
import { type Criteria, type Flatmate, rankFlatmates, scoreFlatmate } from "./matching";
import { EnquiryCreate, EnquiryPatch, ENQUIRY_STATUS, SHORTLIST_STATUS, firstError } from "./validation";

export type Source = "web" | "claude" | "customer";
const decidedBy = (s: Source) => (s === "customer" ? "customer" : "agency");

export class AppError extends Error {
  constructor(message: string, public code: "not_found" | "invalid" = "invalid") {
    super(message);
  }
}

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError(firstError(r.error));
  return r.data;
}

async function log(message: string, source: Source, enquiryId?: number | null) {
  await q("INSERT INTO activities (message, source, enquiry_id) VALUES ($1,$2,$3)", [message, source, enquiryId ?? null]);
}

// ---------------- Enquiries ----------------
export type Enquiry = {
  id: number; customer_name: string; customer_phone: string; gender: string | null; preferred_flatmate_gender: string;
  occupation: string; city: string | null; locality: string | null; budget_min: number | null; budget_max: number | null;
  move_in_by: string | null; food: string | null; smoking: string | null; drinking: string | null; lifestyle: string[];
  notes: string; status: string; is_demo: boolean; source: string; access_token: string; created_at: Date; updated_at: Date; shortlist_count?: number;
};

const ENQ_COLS = ["customer_name", "customer_phone", "gender", "preferred_flatmate_gender", "occupation", "city", "locality", "budget_min", "budget_max", "move_in_by", "food", "smoking", "drinking", "lifestyle", "notes"] as const;

export async function listEnquiries(status?: string) {
  const params: unknown[] = [];
  let where = "";
  if (status === "pending") where = "WHERE e.status NOT IN ('matched','closed')";
  else if (status && (ENQUIRY_STATUS as readonly string[]).includes(status)) { params.push(status); where = "WHERE e.status = $1"; }
  return q<Enquiry>(
    `SELECT e.*, (SELECT count(*)::int FROM shortlists s WHERE s.enquiry_id = e.id) AS shortlist_count
     FROM enquiries e ${where} ORDER BY e.updated_at DESC, e.id DESC`, params);
}

export async function getEnquiry(id: number) {
  const e = await q1<Enquiry>("SELECT * FROM enquiries WHERE id = $1", [id]);
  if (!e) throw new AppError(`Enquiry #${id} not found`, "not_found");
  return e;
}

export function enquiryCriteria(e: Enquiry): Criteria & { seekerGender: string | null } {
  return {
    gender: e.preferred_flatmate_gender !== "any" ? e.preferred_flatmate_gender : null,
    city: e.city, locality: e.locality, budget_min: e.budget_min, budget_max: e.budget_max,
    move_in_by: e.move_in_by, food: e.food, smoking: e.smoking, drinking: e.drinking,
    lifestyle: e.lifestyle, seekerGender: e.gender,
  };
}

export async function createEnquiry(input: unknown, source: Source) {
  const d = parse(EnquiryCreate, input);
  // Default: a female/male seeker wants same-gender flatmates unless told otherwise.
  const pref = d.preferred_flatmate_gender ?? (d.gender === "female" || d.gender === "male" ? d.gender : "any");
  const row = { ...d, preferred_flatmate_gender: pref, customer_phone: d.customer_phone ?? "", occupation: d.occupation ?? "", lifestyle: d.lifestyle ?? [], notes: d.notes ?? "" } as Record<string, unknown>;
  const vals = ENQ_COLS.map((k) => row[k] ?? null);
  const e = await q1<Enquiry>(
    `INSERT INTO enquiries (${ENQ_COLS.join(",")}, source, access_token) VALUES (${ENQ_COLS.map((_, i) => "$" + (i + 1)).join(",")}, $${ENQ_COLS.length + 1}, $${ENQ_COLS.length + 2}) RETURNING *`,
    [...vals, source, newToken()]);
  await log(`New enquiry from ${e!.customer_name}${e!.locality ? ` — ${e!.locality}` : ""}${e!.city ? `, ${e!.city}` : ""}`, source, e!.id);
  return e!;
}

export async function updateEnquiry(id: number, patch: unknown, source: Source) {
  const current = await getEnquiry(id);
  const d = parse(EnquiryPatch, patch) as Record<string, unknown>;
  const keys = ENQ_COLS.filter((k) => d[k] !== undefined);
  const merged = { ...current, ...d } as Enquiry;
  if (merged.budget_min != null && merged.budget_max != null && merged.budget_max < merged.budget_min) throw new AppError("budget_max must be ≥ budget_min");
  if (!keys.length) return current;
  const e = await q1<Enquiry>(`UPDATE enquiries SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...keys.map((k) => d[k])]);
  await log(`${e!.customer_name}'s enquiry edited (${keys.map((k) => k.replace(/_/g, " ")).join(", ")})`, source, id);
  // Keep shortlist scores consistent with the edited criteria.
  await rescoreShortlist(e!);
  return e!;
}

export async function updateEnquiryStatus(id: number, status: string, source: Source, note?: string, matchedFlatmateId?: number) {
  if (!(ENQUIRY_STATUS as readonly string[]).includes(status)) throw new AppError(`status must be one of: ${ENQUIRY_STATUS.join(", ")}`);
  if (matchedFlatmateId && status !== "matched") throw new AppError("matched_flatmate_id can only be used with status 'matched'");
  const e = await getEnquiry(id);
  if (matchedFlatmateId) {
    // Put them on the shortlist if needed, then accept — this takes them out of the matching pool.
    await shortlistFlatmates(id, [matchedFlatmateId], source);
    await acceptShortlisted(id, matchedFlatmateId, source);
  }
  if (e.status === "matched" && status !== "matched") await releaseAccepted(id, source);
  const updated = await q1<Enquiry>(
    `UPDATE enquiries SET status = $2, notes = CASE WHEN $3::text <> '' THEN trim(notes || E'\\n' || $3) ELSE notes END, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status, note ?? ""]);
  if (e.status !== status) await log(`${e.customer_name}'s enquiry moved to “${status}”${note ? ` — ${note}` : ""}`, source, id);
  return updated!;
}

// ---------------- Flatmates & matching ----------------
export async function getFlatmate(id: number) {
  const f = await q1<Flatmate>("SELECT * FROM flatmates WHERE id = $1", [id]);
  if (!f) throw new AppError(`Flatmate #${id} not found`, "not_found");
  return f;
}

export async function countActiveFlatmates() {
  return (await q1<{ n: number }>("SELECT count(*)::int AS n FROM flatmates WHERE status = 'active'"))!.n;
}

export async function searchFlatmates(criteria: Criteria & { seekerGender?: string | null }, opts: { strict?: boolean; limit?: number } = {}) {
  const all = await q<Flatmate>("SELECT * FROM flatmates WHERE status = 'active'");
  return rankFlatmates(all, criteria, opts);
}

export async function matchesForEnquiry(id: number, limit = 10) {
  const e = await getEnquiry(id);
  return { enquiry: e, matches: await searchFlatmates(enquiryCriteria(e), { limit }) };
}

// ---------------- Shortlists ----------------
export type ShortlistRow = {
  id: number; enquiry_id: number; flatmate_id: number; score: number; reason: string; note: string; status: string; source: string;
  created_at: Date; name: string; occupation: string; gender: string; locality: string; city: string; budget_min: number;
  budget_max: number; move_in_date: string; food: string; lifestyle: string[]; is_demo: boolean; flatmate_status: string; matched_with: string | null; decided_by: string | null; decided_at: Date | null; intro: string;
};

export async function getShortlist(enquiryId: number) {
  await getEnquiry(enquiryId);
  return q<ShortlistRow>(
    `SELECT s.*, f.name, f.intro, f.occupation, f.gender, f.locality, f.city, f.budget_min, f.budget_max, f.move_in_date, f.food, f.lifestyle, f.is_demo, f.status AS flatmate_status,
       (SELECT e2.customer_name FROM shortlists s2 JOIN enquiries e2 ON e2.id = s2.enquiry_id
        WHERE s2.flatmate_id = s.flatmate_id AND s2.status = 'accepted' AND s2.enquiry_id <> s.enquiry_id LIMIT 1) AS matched_with
     FROM shortlists s JOIN flatmates f ON f.id = s.flatmate_id WHERE s.enquiry_id = $1 ORDER BY (s.status = 'accepted') DESC, s.score DESC, s.id`, [enquiryId]);
}

export async function shortlistFlatmates(enquiryId: number, flatmateIds: number[], source: Source, note = "") {
  if (!flatmateIds.length) throw new AppError("Provide at least one flatmate_id");
  const e = await getEnquiry(enquiryId);
  const c = enquiryCriteria(e);
  const out: { flatmate_id: number; name: string; score: number; reason: string; already_shortlisted: boolean }[] = [];
  for (const fid of Array.from(new Set(flatmateIds))) {
    const f = await getFlatmate(fid);
    if (f.status !== "active") {
      const own = await q1("SELECT 1 FROM shortlists WHERE enquiry_id = $1 AND flatmate_id = $2", [enquiryId, fid]);
      if (!own) throw new AppError(`${f.name} is no longer available (status: ${f.status}) — already matched with another enquiry`);
    }
    const m = scoreFlatmate(f, c);
    const r = await q1<{ inserted: boolean }>(
      `INSERT INTO shortlists (enquiry_id, flatmate_id, score, reason, note, source) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (enquiry_id, flatmate_id) DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason,
         note = CASE WHEN EXCLUDED.note <> '' THEN EXCLUDED.note ELSE shortlists.note END, updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [enquiryId, fid, m.score, m.summary, note, source]);
    out.push({ flatmate_id: fid, name: f.name, score: m.score, reason: m.summary, already_shortlisted: !r!.inserted });
  }
  await q(`UPDATE enquiries SET status = CASE WHEN status IN ('new','matching') THEN 'shortlisted' ELSE status END, updated_at = now() WHERE id = $1`, [enquiryId]);
  const added = out.filter((o) => !o.already_shortlisted).map((o) => o.name);
  if (added.length) await log(`${added.join(", ")} shortlisted for ${e.customer_name}`, source, enquiryId);
  return out;
}

export async function removeFromShortlist(enquiryId: number, flatmateId: number, source: Source) {
  const r = await q1<{ name: string; status: string }>(
    `DELETE FROM shortlists s USING flatmates f WHERE s.enquiry_id = $1 AND s.flatmate_id = $2 AND f.id = s.flatmate_id RETURNING f.name, s.status`,
    [enquiryId, flatmateId]);
  if (!r) throw new AppError("That profile is not on this shortlist", "not_found");
  await log(`${r.name} removed from enquiry #${enquiryId}'s shortlist`, source, enquiryId);
  if (r.status === "accepted") await releaseFlatmate(flatmateId, enquiryId, source, r.name);
}

export async function updateShortlistEntry(enquiryId: number, flatmateId: number, patch: { status?: string; note?: string }, source: Source) {
  if (patch.status && !(SHORTLIST_STATUS as readonly string[]).includes(patch.status)) throw new AppError(`status must be one of: ${SHORTLIST_STATUS.join(", ")}`);
  const prev = await q1<{ status: string; name: string }>(
    "SELECT s.status, f.name FROM shortlists s JOIN flatmates f ON f.id = s.flatmate_id WHERE s.enquiry_id = $1 AND s.flatmate_id = $2", [enquiryId, flatmateId]);
  if (!prev) throw new AppError("That profile is not on this shortlist", "not_found");
  if (patch.note !== undefined) await q("UPDATE shortlists SET note = $3, updated_at = now() WHERE enquiry_id = $1 AND flatmate_id = $2", [enquiryId, flatmateId, patch.note]);
  if (patch.status && patch.status !== prev.status) {
    if (patch.status === "accepted") {
      await acceptShortlisted(enquiryId, flatmateId, source);
      return;
    }
    const by = patch.status === "declined" ? decidedBy(source) : null;
    await q("UPDATE shortlists SET status = $3, decided_by = $4, decided_at = CASE WHEN $4::text IS NULL THEN NULL ELSE now() END, updated_at = now() WHERE enquiry_id = $1 AND flatmate_id = $2",
      [enquiryId, flatmateId, patch.status, by]);
    if (prev.status === "accepted") await releaseFlatmate(flatmateId, enquiryId, source, prev.name);
  }
  await q("UPDATE enquiries SET updated_at = now() WHERE id = $1", [enquiryId]);
  if (patch.status && patch.status !== prev.status) {
    const e = await getEnquiry(enquiryId);
    await log(source === "customer" && patch.status === "declined"
      ? `${e.customer_name} passed on ${prev.name} via their private link`
      : `Shortlist: ${prev.name} → ${patch.status}${patch.status === "declined" ? " (recorded by agency)" : ""}`, source, enquiryId);
  }
  else if (patch.note !== undefined) await log(`Shortlist note updated for ${prev.name}`, source, enquiryId);
}

/** Accept a shortlisted flatmate: enquiry → matched, flatmate → matched (leaves the pool for every other enquiry). */
async function acceptShortlisted(enquiryId: number, flatmateId: number, source: Source) {
  const f = await getFlatmate(flatmateId);
  const e = await getEnquiry(enquiryId);
  const elsewhere = await q1<{ customer_name: string }>(
    `SELECT e.customer_name FROM shortlists s JOIN enquiries e ON e.id = s.enquiry_id
     WHERE s.flatmate_id = $1 AND s.status = 'accepted' AND s.enquiry_id <> $2 LIMIT 1`, [flatmateId, enquiryId]);
  if (elsewhere) throw new AppError(`${f.name} is already matched with ${elsewhere.customer_name}`);
  const own = await q1<{ name: string }>(
    `SELECT f.name FROM shortlists s JOIN flatmates f ON f.id = s.flatmate_id WHERE s.enquiry_id = $1 AND s.status = 'accepted' AND s.flatmate_id <> $2 LIMIT 1`, [enquiryId, flatmateId]);
  if (own) throw new AppError(`${e.customer_name} has already accepted ${own.name}. Change that first.`);
  await q("UPDATE shortlists SET status = 'accepted', decided_by = $3, decided_at = now(), updated_at = now() WHERE enquiry_id = $1 AND flatmate_id = $2", [enquiryId, flatmateId, decidedBy(source)]);
  await q("UPDATE flatmates SET status = 'matched', updated_at = now() WHERE id = $1", [flatmateId]);
  await q("UPDATE enquiries SET status = 'matched', updated_at = now() WHERE id = $1", [enquiryId]);
  await log(source === "customer"
    ? `${e.customer_name} accepted ${f.name} via their private link — matched`
    : `${e.customer_name} matched with ${f.name} (confirmed by agency)`, source, enquiryId);
}

async function releaseFlatmate(flatmateId: number, enquiryId: number, source: Source, name: string) {
  const still = await q1("SELECT 1 FROM shortlists WHERE flatmate_id = $1 AND status = 'accepted'", [flatmateId]);
  if (still) return;
  await q("UPDATE flatmates SET status = 'active', updated_at = now() WHERE id = $1 AND status = 'matched'", [flatmateId]);
  await log(`${name} is available for matching again`, source, enquiryId);
}

async function releaseAccepted(enquiryId: number, source: Source) {
  const rows = await q<{ flatmate_id: number; name: string }>(
    `UPDATE shortlists s SET status = 'shortlisted', decided_by = NULL, decided_at = NULL, updated_at = now() FROM flatmates f
     WHERE s.enquiry_id = $1 AND s.status = 'accepted' AND f.id = s.flatmate_id RETURNING s.flatmate_id, f.name`, [enquiryId]);
  for (const r of rows) await releaseFlatmate(r.flatmate_id, enquiryId, source, r.name);
}

// ---------------- Customer private link ----------------
export async function getEnquiryByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return q1<Enquiry>("SELECT * FROM enquiries WHERE access_token = $1", [token]);
}

/** The customer accepts or passes on one of their shortlisted profiles. */
export async function customerDecision(token: string, flatmateId: number, decision: "accept" | "decline") {
  const e = await getEnquiryByToken(token);
  if (!e) throw new AppError("This link is not valid", "not_found");
  if (e.status === "closed") throw new AppError("This enquiry is closed. Please contact the agency.");
  await updateShortlistEntry(e.id, flatmateId, { status: decision === "accept" ? "accepted" : "declined" }, "customer");
}

/** Open enquiries (other than `excludeEnquiryId`) each flatmate is currently shortlisted for. */
export async function otherShortlists(flatmateIds: number[], excludeEnquiryId?: number) {
  if (!flatmateIds.length) return new Map<number, { enquiry_id: number; customer_name: string }[]>();
  const rows = await q<{ flatmate_id: number; enquiry_id: number; customer_name: string }>(
    `SELECT s.flatmate_id, e.id AS enquiry_id, e.customer_name FROM shortlists s JOIN enquiries e ON e.id = s.enquiry_id
     WHERE s.flatmate_id = ANY($1::int[]) AND e.id <> $2 AND e.status NOT IN ('closed') AND s.status <> 'declined'
     ORDER BY e.updated_at DESC`, [flatmateIds, excludeEnquiryId ?? 0]);
  const map = new Map<number, { enquiry_id: number; customer_name: string }[]>();
  for (const r of rows) map.set(r.flatmate_id, [...(map.get(r.flatmate_id) ?? []), { enquiry_id: r.enquiry_id, customer_name: r.customer_name }]);
  return map;
}

async function rescoreShortlist(e: Enquiry) {
  const rows = await q<Flatmate & { sid: number }>("SELECT f.*, s.id AS sid FROM shortlists s JOIN flatmates f ON f.id = s.flatmate_id WHERE s.enquiry_id = $1", [e.id]);
  const c = enquiryCriteria(e);
  for (const f of rows) {
    const m = scoreFlatmate(f, c);
    await q("UPDATE shortlists SET score = $2, reason = $3 WHERE id = $1", [f.sid, m.score, m.summary]);
  }
}

// ---------------- Dashboard ----------------
export async function dashboard() {
  await ensureReady();
  const c = (await q1<{ total: number; pending: number; flatmates: number; shortlisted: number; via_claude: number }>(`
    SELECT (SELECT count(*)::int FROM enquiries) AS total,
           (SELECT count(*)::int FROM enquiries WHERE status NOT IN ('matched','closed')) AS pending,
           (SELECT count(*)::int FROM flatmates WHERE status = 'active') AS flatmates,
           (SELECT count(*)::int FROM shortlists) AS shortlisted,
           (SELECT count(*)::int FROM enquiries WHERE source = 'claude') AS via_claude`))!;
  const byStatus = await q<{ status: string; n: number }>("SELECT status, count(*)::int AS n FROM enquiries GROUP BY status");
  const activity = await q<{ id: number; message: string; source: string; enquiry_id: number | null; created_at: Date }>(
    "SELECT * FROM activities ORDER BY created_at DESC, id DESC LIMIT 10");
  return { ...c, byStatus, activity };
}
