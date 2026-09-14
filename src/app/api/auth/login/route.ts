import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Incorrect email or password." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
