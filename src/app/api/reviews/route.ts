import { NextResponse } from "next/server";
import { reviewSchema } from "@/lib/review-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to write a review." }, { status: 401 });
  }

  // The real enforcement is the reviews_insert_with_preorder RLS policy
  // (see schema.sql) — this check exists only to give a clear message
  // instead of a raw insert failure when it's missing.
  const { data: preorder } = await supabase
    .from("preorders")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!preorder) {
    return NextResponse.json(
      { ok: false, message: "Only customers with a pre-order can write a review." },
      { status: 403 }
    );
  }

  const body = await readJsonBody(request);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't submit your review. Please try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
