import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/account/ProfileForm";
import PreorderList, { type PreorderRow } from "@/components/account/PreorderList";
import ReviewForm from "@/components/account/ReviewForm";
import SignOutButton from "@/components/account/SignOutButton";
import DeleteAccountButton from "@/components/account/DeleteAccountButton";
import { layout } from "@/config/brand";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account — YEXX Energy Drink",
  description: "Your YEXX account.",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this route — this is a second, cheap check
  // directly against the same request's session, not a network call to a
  // different system, so it's not the wasteful kind of duplication.
  if (!user) redirect("/account/login?redirect=/account");

  const [{ data: profile }, { data: preorders }, { data: myReview }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, city").eq("id", user.id).single(),
    supabase
      .from("preorders")
      .select("id, size, quantity, notes, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, status").eq("user_id", user.id).maybeSingle(),
  ]);

  const preorderRows: PreorderRow[] = (preorders ?? []).map((row) => ({
    id: row.id,
    size: row.size,
    quantity: row.quantity,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  }));

  return (
    <>
      <PageHeader kicker="Account" title="Your Account" description={user.email} />
      <div className={`${layout.container} flex flex-col gap-16 px-6 pb-24 md:px-12 lg:px-20`}>
        <section className="flex flex-col gap-6 border-t border-ink/12 pt-10">
          <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Profile</p>
          <ProfileForm
            initial={{
              fullName: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              city: profile?.city ?? "",
            }}
          />
        </section>

        <section className="flex flex-col gap-6 border-t border-ink/12 pt-10">
          <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Your Pre-Orders</p>
          <PreorderList initial={preorderRows} />
        </section>

        {preorderRows.length > 0 && (
          <section className="flex flex-col gap-6 border-t border-ink/12 pt-10">
            <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Write a Review</p>
            {myReview ? (
              <p className="text-sm text-ink/60">
                {myReview.status === "approved"
                  ? "Your review is live on the product page."
                  : "Your review is submitted and awaiting approval."}
              </p>
            ) : (
              <ReviewForm />
            )}
          </section>
        )}

        <section className="flex flex-col gap-6 border-t border-ink/12 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <SignOutButton />
          <DeleteAccountButton />
        </section>
      </div>
    </>
  );
}
