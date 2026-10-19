"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { leads, listingRequests, operators, outreachDrafts, trips } from "@/db/schema";
import { requireAdmin } from "./guard";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function id(form: FormData): number {
  const n = Number(form.get("id"));
  if (!Number.isInteger(n) || n <= 0) throw new Error("bad id");
  return n;
}

export async function setTripStatus(form: FormData) {
  await requireAdmin();
  const status = str(form, "status");
  if (status !== "published" && status !== "hidden") throw new Error("bad status");
  await getDb().update(trips).set({ status, updatedAt: new Date() }).where(eq(trips.id, id(form)));
  revalidatePath("/", "layout");
}

export async function featureTrip(form: FormData) {
  await requireAdmin();
  const days = Number(str(form, "days"));
  const featuredUntil = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  await getDb().update(trips).set({ featuredUntil, updatedAt: new Date() }).where(eq(trips.id, id(form)));
  revalidatePath("/", "layout");
}

export async function setTripAffiliateUrl(form: FormData) {
  await requireAdmin();
  const url = str(form, "affiliate_url");
  if (url && !/^https?:\/\//.test(url)) throw new Error("affiliate URL must be http(s)");
  await getDb().update(trips).set({ affiliateUrl: url || null }).where(eq(trips.id, id(form)));
  revalidatePath("/admin");
}

export async function updateOperator(form: FormData) {
  await requireAdmin();
  const paramsText = str(form, "affiliate_params");
  // "ref=padelholidays&aff=123" -> {ref: "padelholidays", aff: "123"}
  const affiliateParams = paramsText ? Object.fromEntries(new URLSearchParams(paramsText)) : null;
  const partnerStatus = str(form, "partner_status") as (typeof operators.$inferInsert)["partnerStatus"];
  await getDb()
    .update(operators)
    .set({
      affiliateParams,
      partnerStatus,
      commissionNote: str(form, "commission_note") || null,
      contactEmail: str(form, "contact_email") || null,
    })
    .where(eq(operators.id, id(form)));
  revalidatePath("/admin");
}

export async function setLeadStatus(form: FormData) {
  await requireAdmin();
  const status = str(form, "status") as (typeof leads.$inferInsert)["status"];
  await getDb().update(leads).set({ status }).where(eq(leads.id, id(form)));
  revalidatePath("/admin");
}

export async function setDraftStatus(form: FormData) {
  await requireAdmin();
  const status = str(form, "status");
  if (status !== "sent" && status !== "discarded") throw new Error("bad status");
  const db = getDb();
  const [draft] = await db.update(outreachDrafts).set({ status }).where(eq(outreachDrafts.id, id(form))).returning();
  if (draft && status === "sent") {
    await db.update(operators).set({ partnerStatus: "contacted" }).where(eq(operators.id, draft.operatorId));
  }
  revalidatePath("/admin");
}

export async function markListingRequestHandled(form: FormData) {
  await requireAdmin();
  await getDb().update(listingRequests).set({ handled: true }).where(eq(listingRequests.id, id(form)));
  revalidatePath("/admin");
}
