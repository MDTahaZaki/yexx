import { NextResponse } from "next/server";
import { preorderSchema } from "@/lib/preorder-schema";
import { createClient } from "@/lib/supabase/server";
import { sendLead } from "@/lib/send-lead";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to place a pre-order." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = preorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const consentAt = new Date().toISOString();

  // user_id is set from the verified session, never from the request
  // body — the insert policy (preorders_insert_own) would reject a
  // mismatched id anyway, but there's no reason to give a client the
  // chance to even try.
  const { data: row, error } = await supabase
    .from("preorders")
    .insert({
      user_id: user.id,
      size: parsed.data.size,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
      consent_at: consentAt,
    })
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { ok: false, message: "Couldn't register your pre-order. Please try again." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, city")
    .eq("id", user.id)
    .single();

  await sendLead("preorder", {
    preorderId: row.id,
    email: user.email,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    city: profile?.city ?? null,
    size: parsed.data.size,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
    consentAt,
  });

  return NextResponse.json({ ok: true, id: row.id });
}
