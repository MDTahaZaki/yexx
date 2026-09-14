import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// `middleware.ts` is deprecated in this Next.js version (renamed to
// `proxy.ts`, exporting `proxy` instead of `middleware`) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and image files — kept broad so the
    // session cookie refreshes on API routes too, not just page loads.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
