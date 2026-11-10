"use server";
import { revalidatePath } from "next/cache";
import { AppError, customerDecision } from "@/lib/repo";

export type DecisionState = { error?: string };

export async function decideAction(_: DecisionState, fd: FormData): Promise<DecisionState> {
  const token = String(fd.get("token") ?? "");
  const decision = fd.get("decision") === "accept" ? "accept" : "decline";
  try {
    await customerDecision(token, Number(fd.get("flatmate_id")), decision);
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "Something went wrong — please try again." };
  }
  revalidatePath(`/c/${token}`);
  revalidatePath("/", "layout");
  return {};
}
