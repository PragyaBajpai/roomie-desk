"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, demoCredentials } from "@/lib/auth";
import {
  AppError, createEnquiry, removeFromShortlist, shortlistFlatmates, updateEnquiry, updateEnquiryStatus, updateShortlistEntry,
} from "@/lib/repo";

export type FormState = { ok?: boolean; error?: string; savedAt?: number; username?: string };

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const { username, password } = demoCredentials();
  if (String(fd.get("username")).trim().toLowerCase() !== username.toLowerCase() || fd.get("password") !== password) {
    return { error: "Incorrect email or password", username: String(fd.get("username") ?? "") };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_MAX_AGE, path: "/",
  });
  const next = String(fd.get("next") || "/dashboard");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function resetDemoAction() {
  const { resetDemoData } = await import("@/lib/db");
  await resetDemoData();
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

function enquiryFromForm(fd: FormData) {
  const s = (k: string) => {
    const v = fd.get(k);
    return v == null ? undefined : String(v).trim();
  };
  const n = (k: string) => {
    const v = s(k);
    return v ? Number(v.replace(/[,₹\s]/g, "")) : null;
  };
  return {
    customer_name: s("customer_name"),
    customer_phone: s("customer_phone") ?? "",
    gender: s("gender") || null,
    preferred_flatmate_gender: s("preferred_flatmate_gender") || "any",
    occupation: s("occupation") ?? "",
    city: s("city") || null,
    locality: s("locality") || null,
    budget_min: n("budget_min"),
    budget_max: n("budget_max"),
    move_in_by: s("move_in_by") || null,
    food: s("food") || null,
    smoking: s("smoking") || null,
    drinking: s("drinking") || null,
    lifestyle: fd.getAll("lifestyle").map(String),
    notes: s("notes") ?? "",
  };
}

const errMsg = (e: unknown) => (e instanceof AppError ? e.message : "Something went wrong — please try again.");

export async function createEnquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  let id: number;
  try {
    id = (await createEnquiry(enquiryFromForm(fd), "web")).id;
  } catch (e) {
    return { error: errMsg(e) };
  }
  revalidatePath("/", "layout");
  redirect(`/enquiries/${id}`);
}

export async function saveEnquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = Number(fd.get("id"));
  try {
    await updateEnquiry(id, enquiryFromForm(fd), "web");
    const status = fd.get("status");
    if (status) {
      const { getEnquiry } = await import("@/lib/repo");
      if ((await getEnquiry(id)).status !== status) await updateEnquiryStatus(id, String(status), "web");
    }
  } catch (e) {
    return { error: errMsg(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

export async function shortlistAction(fd: FormData) {
  const eid = Number(fd.get("enquiry_id"));
  await shortlistFlatmates(eid, [Number(fd.get("flatmate_id"))], "web");
  revalidatePath("/", "layout");
}

export async function unshortlistAction(fd: FormData) {
  await removeFromShortlist(Number(fd.get("enquiry_id")), Number(fd.get("flatmate_id")), "web");
  revalidatePath("/", "layout");
}

export async function shortlistEntryAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await updateShortlistEntry(Number(fd.get("enquiry_id")), Number(fd.get("flatmate_id")), {
      status: String(fd.get("status") || "") || undefined,
      note: fd.get("note") == null ? undefined : String(fd.get("note")),
    }, "web");
  } catch (e) {
    return { error: errMsg(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
