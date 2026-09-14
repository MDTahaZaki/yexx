import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ResetConfirmForm from "@/components/account/ResetConfirmForm";
import { layout } from "@/config/brand";

export const metadata: Metadata = {
  title: "Set New Password — YEXX Energy Drink",
  description: "Set a new password for your YEXX account.",
};

export default function ResetConfirmPage() {
  return (
    <>
      <PageHeader kicker="Account" title="Set New Password" />
      <div className={`${layout.container} max-w-md px-6 pb-24 md:px-12 lg:px-20`}>
        <div className="border-t border-ink/12 pt-10">
          <ResetConfirmForm />
        </div>
      </div>
    </>
  );
}
