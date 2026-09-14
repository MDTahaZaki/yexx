import { NextResponse } from "next/server";
import { resetConfirmSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";

// Requires an active session — the one established when the user clicked
// the emailed reset link and /auth/callback exchanged its code. There's
// nothing else to check here: `updateUser` operates on whichever session
// the request's cookies carry, and that's the recovery session, scoped to
// the account that requested the reset in the first place.
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = resetConfirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "This reset link has expired. Request a new one." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't update your password. Please try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
