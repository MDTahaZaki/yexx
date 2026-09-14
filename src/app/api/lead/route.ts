import { NextResponse } from "next/server";
import { wholesaleSchema } from "@/lib/wholesale-schema";
import { sendLead } from "@/lib/send-lead";
import { readJsonBody } from "@/lib/read-json-body";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
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
