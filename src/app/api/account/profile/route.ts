import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/profile-schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // `.eq("id", user.id)` is belt-and-suspenders on top of the RLS policy
  // (profiles_update_own already restricts this to the caller's own row) —
  // explicit here so the intent reads the same as the enforcement.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't save your profile. Please try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
