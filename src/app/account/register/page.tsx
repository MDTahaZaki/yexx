import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import RegisterForm from "@/components/account/RegisterForm";
import { layout } from "@/config/brand";

export const metadata: Metadata = {
  title: "Create Account — YEXX Energy Drink",
  description: "Create a YEXX account.",
};

function safeRedirect(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") ? v : "/account";
}

export default async function RegisterPage(props: PageProps<"/account/register">) {
  const searchParams = await props.searchParams;
  const redirectTo = safeRedirect(searchParams.redirect);

  return (
    <>
      <PageHeader kicker="Account" title="Create Account" />
      <div className={`${layout.container} max-w-md px-6 pb-24 md:px-12 lg:px-20`}>
        <div className="border-t border-ink/12 pt-10">
          <RegisterForm redirectTo={redirectTo} />
        </div>
      </div>
    </>
  );
}
