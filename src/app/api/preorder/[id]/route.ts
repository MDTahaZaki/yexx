import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cancelling a pre-order is a hard delete, not a status change — matches
// the RLS policy set (preorders has insert/select/delete policies, no
// update). `.eq("user_id", user.id)` on top of that policy means this can
// never delete a row belonging to anyone but the caller, even if RLS were
// somehow misconfigured later.
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/preorder/[id]">) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("preorders")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't cancel that pre-order. Please try again." },
      { status: 400 }
    );
  }

  if (!count) {
    return NextResponse.json({ ok: false, message: "Pre-order not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
