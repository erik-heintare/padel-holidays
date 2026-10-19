import { headers } from "next/headers";
import { isAdminAuthorized } from "@/lib/admin-auth";

/** Second line of defence behind the proxy: every admin render and action re-checks credentials. */
export async function requireAdmin(): Promise<void> {
  if (!isAdminAuthorized((await headers()).get("authorization"))) throw new Error("Unauthorized");
}
