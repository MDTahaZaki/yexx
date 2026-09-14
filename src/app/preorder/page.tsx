import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import FadeUp from "@/components/FadeUp";
import PreorderForm from "@/components/PreorderForm";
import ExistingPreorder from "@/components/ExistingPreorder";
import FaqAccordion from "@/components/FaqAccordion";
import SweepButton from "@/components/SweepButton";
import { layout } from "@/config/brand";
import { preorderFaqs } from "@/lib/faq";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pre-Order — YEXX Energy Drink",
  description: "Register your interest for a YEXX pre-order.",
};

export default async function PreorderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <PageHeader
          kicker="Pre-Order"
          title="Register Your Interest"
          description="Pre-ordering reserves your spot on the list for the next batch — it's free, and it's not a purchase."
        />
        <div className={`${layout.container} max-w-lg px-6 pb-24 md:px-12 lg:px-20`}>
          <div className="flex flex-col gap-6 border-t border-ink/12 pt-10">
            <FadeUp className="text-sm leading-relaxed text-ink/70">
              No payment is taken at any point in this flow, and there&apos;s no confirmed shipping
              date yet — pre-ordering just tells us how much demand to plan for, and gets you a
              heads-up the moment sizes are ready to ship. Sign in or create a free account to
              register one.
            </FadeUp>
            <div className="flex flex-wrap items-center gap-6">
              <SweepButton variant="dark" href="/account/login?redirect=/preorder">
                Sign In
              </SweepButton>
              <SweepButton variant="light" href="/account/register?redirect=/preorder">
                Create Account
              </SweepButton>
            </div>
          </div>
        </div>
        <div className={`${layout.container} ${layout.section} max-w-3xl`}>
          <FaqAccordion items={preorderFaqs} />
        </div>
      </>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <>
        <PageHeader kicker="Pre-Order" title="Confirm Your Email" />
        <div className={`${layout.container} max-w-lg px-6 pb-24 md:px-12 lg:px-20`}>
          <p className="border-t border-ink/12 pt-10 text-sm leading-relaxed text-ink/70">
            Check your inbox for a confirmation link before placing a pre-order — it&apos;s how we
            make sure the email we&apos;ll use to reach you actually works.
          </p>
        </div>
      </>
    );
  }

  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, city").eq("id", user.id).single(),
    supabase
      .from("preorders")
      .select("id, size, quantity, notes")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        kicker="Pre-Order"
        title="Register Your Interest"
        description="Reserve your spot for the next batch. No payment now, and the shipping date isn't confirmed yet."
      />
      <div className={`${layout.container} max-w-lg px-6 pb-24 md:px-12 lg:px-20`}>
        {existing ? (
          <ExistingPreorder preorder={existing} />
        ) : (
          <PreorderForm
            contact={{
              fullName: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              city: profile?.city ?? "",
            }}
          />
        )}
      </div>
      <div className={`${layout.container} ${layout.section} max-w-3xl`}>
        <FaqAccordion items={preorderFaqs} />
      </div>
    </>
  );
}
