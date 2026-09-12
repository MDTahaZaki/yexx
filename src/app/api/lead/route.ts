import { NextResponse } from "next/server";
import { wholesaleSchema } from "@/lib/wholesale-schema";
import { sendLead } from "@/lib/send-lead";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = wholesaleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await sendLead("wholesale", parsed.data);

  return NextResponse.json({ ok: true });
}
