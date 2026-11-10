import { z } from "zod";

export const GENDERS = ["female", "male", "non-binary"] as const;
export const PREF_GENDERS = ["female", "male", "any"] as const;
export const FOODS = ["vegetarian", "vegan", "eggetarian", "non-vegetarian", "any"] as const;
export const SMOKING_PREF = ["non-smoker", "any"] as const;
export const DRINKING_PREF = ["never", "any"] as const;
export const ENQUIRY_STATUS = ["new", "matching", "shortlisted", "contacted", "matched", "closed"] as const;
export const SHORTLIST_STATUS = ["shortlisted", "contacted", "accepted", "declined"] as const;
export const LIFESTYLE_TAGS = [
  "early-riser", "night-owl", "quiet", "social", "tidy", "fitness", "pet-friendly", "plant-lover",
  "studious", "creative", "gamer", "music", "traveller", "bookworm",
] as const;

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

const money = z.coerce.number().int("Whole rupees only").min(0).max(1_000_000);
const text = (max: number) => z.string().trim().max(max);
const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(12)
  .transform((a) => Array.from(new Set(a)));

// "any" for smoking/drinking/food is stored as null = no constraint.
const anyToNull = <T extends z.ZodTypeAny>(s: T) =>
  s.nullable().optional().transform((v) => (v === "any" || v === "" ? null : v));

export const EnquiryFields = z.object({
  customer_name: text(80).min(2, "Customer name is required"),
  customer_phone: text(30).optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  preferred_flatmate_gender: z.enum(PREF_GENDERS).optional(),
  occupation: text(80).optional(),
  city: text(60).nullable().optional(),
  locality: text(80).nullable().optional(),
  budget_min: money.nullable().optional(),
  budget_max: money.nullable().optional(),
  move_in_by: isoDate.nullable().optional(),
  food: anyToNull(z.enum(FOODS)),
  smoking: anyToNull(z.enum(SMOKING_PREF)),
  drinking: anyToNull(z.enum(DRINKING_PREF)),
  lifestyle: tags.optional(),
  notes: text(2000).optional(),
});

const budgetOk = (v: { budget_min?: number | null; budget_max?: number | null }) =>
  v.budget_min == null || v.budget_max == null || v.budget_max >= v.budget_min;

export const EnquiryCreate = EnquiryFields.refine(budgetOk, { message: "budget_max must be ≥ budget_min", path: ["budget_max"] });
export const EnquiryPatch = EnquiryFields.partial();

export function firstError(e: z.ZodError) {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}
