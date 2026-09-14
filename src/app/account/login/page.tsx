import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import LoginForm from "@/components/account/LoginForm";
import { layout } from "@/config/brand";

export const metadata: Metadata = {
  title: "Sign In — YEXX Energy Drink",
  description: "Sign in to your YEXX account.",
};

function safeRedirect(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") ? v : "/account";
}

export default async function LoginPage(props: PageProps<"/account/login">) {
  const searchParams = await props.searchParams;
  const redirectTo = safeRedirect(searchParams.redirect);
  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <>
      <PageHeader kicker="Account" title="Sign In" />
      <div className={`${layout.container} max-w-md px-6 pb-24 md:px-12 lg:px-20`}>
        <div className="border-t border-ink/12 pt-10">
          {errorMessage && (
            <p className="mb-6 text-xs tracking-[0.05em] text-ink/70">{errorMessage}</p>
          )}
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </>
  );
}
