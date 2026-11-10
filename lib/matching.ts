// Deterministic, explainable flatmate matching. No AI is used for scoring.
// Weights: budget 30, location 25, move-in 20, food 10, lifestyle 15 = 100.

export type Flatmate = {
  id: number;
  name: string;
  gender: string;
  preferred_gender: string;
  occupation: string;
  city: string;
  locality: string;
  budget_min: number;
  budget_max: number;
  move_in_date: string;
  food: string;
  smoking: string;
  drinking: string;
  work_schedule: string;
  lifestyle: string[];
  intro: string;
  phone: string;
  status: string;
  is_demo: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

export type Criteria = {
  gender?: string | null;
  city?: string | null;
  locality?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  move_in_by?: string | null;
  food?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  lifestyle?: string[] | null;
};

export type CriterionResult = {
  key: "budget" | "location" | "move_in" | "food" | "lifestyle";
  label: string;
  weight: number;
  points: number;
  met: boolean;
  detail: string;
};

export type MatchResult = {
  score: number;
  meets_all_criteria: boolean;
  breakdown: CriterionResult[];
  summary: string;
};

export const WEIGHTS = { budget: 30, location: 25, move_in: 20, food: 10, lifestyle: 15 } as const;

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function normLocality(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bph(?:ase)?\.?\s*/g, "phase ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86_400_000);
}

export function fmtDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function scoreBudget(f: Flatmate, c: Criteria): CriterionResult {
  const w = WEIGHTS.budget;
  const cmin = c.budget_min ?? 0;
  const cmax = c.budget_max ?? Number.POSITIVE_INFINITY;
  if (c.budget_min == null && c.budget_max == null) {
    return { key: "budget", label: "Budget", weight: w, points: w, met: true, detail: "No budget constraint given" };
  }
  const range = `${inr(f.budget_min)}–${inr(f.budget_max)}`;
  const want = c.budget_max == null ? `from ${inr(cmin)}` : c.budget_min == null ? `budget up to ${inr(c.budget_max)}` : `${inr(cmin)}–${inr(c.budget_max)}`;
  if (f.budget_max >= cmin && f.budget_min <= cmax) {
    return { key: "budget", label: "Budget", weight: w, points: w, met: true, detail: `Budget ${range} overlaps ${want}` };
  }
  const gap = f.budget_max < cmin ? cmin - f.budget_max : f.budget_min - cmax;
  const ref = Number.isFinite(cmax) ? cmax : Math.max(cmin, 1);
  const pts = Math.max(0, w * (1 - gap / ref / 0.25));
  return { key: "budget", label: "Budget", weight: w, points: round1(pts), met: false, detail: `Budget ${range} is ${inr(gap)} outside ${want}` };
}

function scoreLocation(f: Flatmate, c: Criteria): CriterionResult {
  const w = WEIGHTS.location;
  if (!c.locality && !c.city) return { key: "location", label: "Location", weight: w, points: w, met: true, detail: "No location constraint given" };
  const sameCity = !c.city || c.city.trim().toLowerCase() === f.city.trim().toLowerCase();
  if (!c.locality) {
    return sameCity
      ? { key: "location", label: "Location", weight: w, points: w, met: true, detail: `Based in ${f.city}` }
      : { key: "location", label: "Location", weight: w, points: 0, met: false, detail: `Based in ${f.city}, not ${c.city}` };
  }
  const a = normLocality(f.locality);
  const b = normLocality(c.locality);
  if (sameCity && a === b) {
    return { key: "location", label: "Location", weight: w, points: w, met: true, detail: `Wants ${f.locality}, exactly as requested` };
  }
  // Requested area is broader ("Hinjewadi") and profile is inside it ("Hinjewadi Phase 1")
  if (sameCity && !/phase/.test(b) && a.startsWith(b)) {
    return { key: "location", label: "Location", weight: w, points: w, met: true, detail: `Wants ${f.locality}, within ${c.locality}` };
  }
  if (sameCity && a.split(" ")[0] === b.split(" ")[0]) {
    return { key: "location", label: "Location", weight: w, points: 15, met: false, detail: `Wants ${f.locality} — next door to ${c.locality}` };
  }
  if (sameCity) return { key: "location", label: "Location", weight: w, points: 7, met: false, detail: `Wants ${f.locality}, same city but different area` };
  return { key: "location", label: "Location", weight: w, points: 0, met: false, detail: `Based in ${f.city}, not ${c.city}` };
}

function scoreMoveIn(f: Flatmate, c: Criteria): CriterionResult {
  const w = WEIGHTS.move_in;
  if (!c.move_in_by) return { key: "move_in", label: "Move-in date", weight: w, points: w, met: true, detail: `Moving in ${fmtDate(f.move_in_date)}` };
  const late = daysBetween(f.move_in_date, c.move_in_by);
  if (late <= 0) {
    return { key: "move_in", label: "Move-in date", weight: w, points: w, met: true, detail: `Moves in ${fmtDate(f.move_in_date)}, ${late === 0 ? "on" : "before"} ${fmtDate(c.move_in_by)}` };
  }
  const pts = late <= 7 ? 14 : late <= 14 ? 10 : late <= 30 ? 5 : 0;
  return { key: "move_in", label: "Move-in date", weight: w, points: pts, met: false, detail: `Moves in ${fmtDate(f.move_in_date)}, ${late} day${late === 1 ? "" : "s"} after ${fmtDate(c.move_in_by)}` };
}

function scoreFood(f: Flatmate, c: Criteria): CriterionResult {
  const w = WEIGHTS.food;
  const want = c.food;
  if (!want || want === "any") return { key: "food", label: "Food", weight: w, points: w, met: true, detail: `Eats ${f.food}` };
  let pts = 0;
  if (f.food === want) pts = w;
  else if (want === "vegetarian" && f.food === "vegan") pts = w;
  else if (want === "eggetarian" && (f.food === "vegetarian" || f.food === "vegan")) pts = w;
  else if (want === "vegan" && f.food === "vegetarian") pts = 6;
  else if (want === "vegetarian" && f.food === "eggetarian") pts = 5;
  else if (want === "non-vegetarian" && f.food === "any") pts = w;
  else if (f.food === "any") pts = 4;
  else if (want === "non-vegetarian") pts = 5;
  const met = pts === w;
  return { key: "food", label: "Food", weight: w, points: pts, met, detail: met ? `${cap(f.food)} — matches ${want} preference` : `${cap(f.food)}, requested ${want}` };
}

function scoreLifestyle(f: Flatmate, c: Criteria): CriterionResult {
  const w = WEIGHTS.lifestyle;
  const notes: string[] = [];
  let smoke = 5, drink = 5, tags = 5;
  if (c.smoking === "non-smoker") {
    smoke = f.smoking === "non-smoker" ? 5 : f.smoking === "occasionally" ? 2.5 : 0;
    notes.push(f.smoking === "non-smoker" ? "non-smoker" : `${f.smoking} (wanted non-smoker)`);
  } else notes.push(f.smoking);
  if (c.drinking === "never") {
    drink = f.drinking === "never" ? 5 : f.drinking === "socially" ? 2.5 : 0;
    notes.push(f.drinking === "never" ? "doesn't drink" : `drinks ${f.drinking} (wanted never)`);
  } else notes.push(f.drinking === "never" ? "doesn't drink" : `drinks ${f.drinking}`);
  const want = (c.lifestyle ?? []).map((t) => t.toLowerCase());
  const have = (f.lifestyle ?? []).map((t) => t.toLowerCase());
  if (want.length) {
    const overlap = want.filter((t) => have.includes(t));
    const clash = (want.includes("early-riser") && have.includes("night-owl")) || (want.includes("night-owl") && have.includes("early-riser")) || (want.includes("quiet") && have.includes("social") && !have.includes("quiet"));
    tags = Math.min(1, overlap.length / Math.min(2, want.length)) * 5;
    if (clash) tags = Math.max(0, tags - 2.5);
    if (overlap.length) notes.push(`shares ${overlap.join(", ")}`);
    if (clash) notes.push("some routine clash");
  }
  const pts = round1(smoke + drink + tags);
  return { key: "lifestyle", label: "Lifestyle", weight: w, points: pts, met: pts >= 12.5, detail: cap(notes.join(", ")) };
}

export function scoreFlatmate(f: Flatmate, c: Criteria): MatchResult {
  const breakdown = [scoreBudget(f, c), scoreLocation(f, c), scoreMoveIn(f, c), scoreFood(f, c), scoreLifestyle(f, c)];
  const score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));
  const hard = breakdown.filter((b) => b.key !== "lifestyle");
  const meets = hard.every((b) => b.met);
  const misses = hard.filter((b) => !b.met).map((b) => b.label.toLowerCase());
  const summary = meets
    ? `${score}/100 — meets every requested criterion. ${breakdown.filter((b) => b.key !== "lifestyle").map((b) => b.detail).join("; ")}.`
    : `${score}/100 — partial match (misses ${misses.join(", ")}).`;
  return { score, meets_all_criteria: meets, breakdown, summary };
}

/** Hard filters applied before scoring: active, gender, city, mutual gender preference. */
export function passesHardFilters(f: Flatmate, c: Criteria & { seekerGender?: string | null }) {
  if (f.status !== "active") return false;
  if (c.gender && f.gender !== c.gender) return false;
  if (c.city && f.city.trim().toLowerCase() !== c.city.trim().toLowerCase()) return false;
  if (c.seekerGender && f.preferred_gender !== "any" && f.preferred_gender !== c.seekerGender) return false;
  return true;
}

export function rankFlatmates(list: Flatmate[], c: Criteria & { seekerGender?: string | null }, opts: { strict?: boolean; excludeId?: number; limit?: number } = {}) {
  return list
    .filter((f) => f.id !== opts.excludeId && passesHardFilters(f, c))
    .map((f) => ({ flatmate: f, match: scoreFlatmate(f, c) }))
    .filter((r) => !opts.strict || r.match.meets_all_criteria)
    .sort((a, b) => b.match.score - a.match.score || a.flatmate.move_in_date.localeCompare(b.flatmate.move_in_date) || a.flatmate.id - b.flatmate.id)
    .slice(0, opts.limit ?? 50);
}

/** What a flatmate would want in someone else — used for "compatible flatmates". */
export function criteriaFromFlatmate(f: Flatmate): Criteria & { seekerGender: string } {
  const by = new Date(Date.parse(f.move_in_date + "T00:00:00Z") + 14 * 86_400_000).toISOString().slice(0, 10);
  return {
    gender: f.preferred_gender !== "any" ? f.preferred_gender : null,
    city: f.city,
    locality: f.locality,
    budget_min: f.budget_min,
    budget_max: f.budget_max,
    move_in_by: by,
    food: f.food === "vegetarian" || f.food === "vegan" || f.food === "eggetarian" ? f.food : null,
    smoking: f.smoking === "non-smoker" ? "non-smoker" : null,
    drinking: f.drinking === "never" ? "never" : null,
    lifestyle: f.lifestyle,
    seekerGender: f.gender,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
