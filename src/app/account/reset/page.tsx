import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ResetRequestForm from "@/components/account/ResetRequestForm";
import { layout } from "@/config/brand";

export const metadata: Metadata = {
  title: "Reset Password — YEXX Energy Drink",
  description: "Reset your YEXX account password.",
};

export default function ResetPage() {
  return (
    <>
      <PageHeader
        kicker="Account"
        title="Reset Password"
        description="Enter your email and we'll send you a link to set a new password."
      />
      <div className={`${layout.container} max-w-md px-6 pb-24 md:px-12 lg:px-20`}>
        <div className="border-t border-ink/12 pt-10">
          <ResetRequestForm />
        </div>
      </div>
    </>
  );
}
