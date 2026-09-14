import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// India's DPDP Act requires a working self-service delete, not a "contact
// support" form — this is that path. Deleting the auth.users row is an
// admin-API operation (the one legitimate use of the secret key in this
// project), but WHOSE row gets deleted is decided entirely server-side
// from the caller's own verified session — the request body is never
// consulted, so there's no id parameter for a client to tamper with.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't delete your account. Please try again." },
      { status: 400 }
    );
  }

  // profiles and preorders rows are gone too by now — both reference
  // auth.users(id) on delete cascade.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
