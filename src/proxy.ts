import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";

export function proxy(req: NextRequest) {
  if (isAdminAuthorized(req.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Padel Holidays admin"' },
  });
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
