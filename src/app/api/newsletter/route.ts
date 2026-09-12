import { NextResponse } from "next/server";
import { newsletterSchema } from "@/lib/newsletter-schema";
import { sendLead } from "@/lib/send-lead";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await sendLead("newsletter", parsed.data);

  return NextResponse.json({ ok: true });
}
