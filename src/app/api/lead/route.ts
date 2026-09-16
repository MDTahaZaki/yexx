import { NextResponse } from "next/server";
import { wholesaleSchema } from "@/lib/wholesale-schema";
import { sendLead } from "@/lib/send-lead";
import { readJsonBody } from "@/lib/read-json-body";
import { sanitizeBodyField, containsUrl } from "@/lib/sanitize-text";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = wholesaleSchema.safeParse(sanitizeBodyField(body, "notes"));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Same spam-vector rejection as pre-order notes — a wholesale inquiry
  // note has no legitimate reason to carry a link.
  if (parsed.data.notes && containsUrl(parsed.data.notes)) {
    return NextResponse.json(
      { ok: false, errors: { notes: ["Links aren't allowed in notes."] } },
      { status: 400 }
    );
  }

  await sendLead("wholesale", parsed.data);

  return NextResponse.json({ ok: true });
}
