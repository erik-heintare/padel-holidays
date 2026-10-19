import { afterEach, describe, expect, it } from "vitest";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { hasBearer } from "@/lib/auth";

const req = (auth?: string) => new Request("https://x.example", { headers: auth ? { authorization: auth } : {} });

describe("hasBearer", () => {
  it("accepts the right token only", () => {
    expect(hasBearer(req("Bearer s3cret"), "s3cret")).toBe(true);
    expect(hasBearer(req("Bearer wrong"), "s3cret")).toBe(false);
    expect(hasBearer(req(), "s3cret")).toBe(false);
  });
  it("fails closed when no secret is configured", () => {
    expect(hasBearer(req("Bearer "), undefined)).toBe(false);
    expect(hasBearer(req("Bearer undefined"), undefined)).toBe(false);
  });
});

describe("isAdminAuthorized", () => {
  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });
  it("checks the basic-auth password", () => {
    process.env.ADMIN_PASSWORD = "pw:with:colons";
    expect(isAdminAuthorized(`Basic ${btoa("admin:pw:with:colons")}`)).toBe(true);
    expect(isAdminAuthorized(`Basic ${btoa("admin:nope")}`)).toBe(false);
    expect(isAdminAuthorized(null)).toBe(false);
  });
  it("fails closed when ADMIN_PASSWORD is unset", () => {
    expect(isAdminAuthorized(`Basic ${btoa("admin:")}`)).toBe(false);
  });
});
