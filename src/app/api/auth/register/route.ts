import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Never echo the raw provider error — it can distinguish "no such
    // account" style detail an attacker could use to enumerate emails.
    return NextResponse.json(
      { ok: false, message: "Couldn't create that account. It may already exist." },
      { status: 400 }
    );
  }

  // With email confirmation on (the project default), signUp succeeds but
  // returns no session until the user clicks the confirmation link — the
  // form needs to tell them that rather than assume they're signed in.
  return NextResponse.json({ ok: true, needsEmailConfirmation: data.session === null });
}
