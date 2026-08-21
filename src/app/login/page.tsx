import Link from "next/link";
import { LoginForm } from "./login-form";
import { Card } from "@/components/ui";

export const metadata = { title: "Sign in — UPAY Footpathshala" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-surface-2 p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[--radius-base] bg-primary text-sm font-bold text-primary-fg">
            U
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">UPAY</p>
            <p className="text-xs text-muted">Footpathshala</p>
          </div>
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            One record of what actually happened at every centre.
          </h2>
          <p className="mt-4 text-muted">
            Attendance, service hours, lessons delivered and assessment results, captured once and
            usable everywhere — including by people who have never written a database query.
          </p>
        </div>

        <p className="text-xs text-muted">
          Underprivileged Advancement by Youth · Footpathshala operations platform
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-in">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[--radius-base] bg-primary text-sm font-bold text-primary-fg">
                U
              </span>
              <p className="text-sm font-semibold">UPAY Footpathshala</p>
            </Link>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Use a demo account below, or your own credentials.
          </p>

          <LoginForm
            next={next ?? "/dashboard"}
            demoPassword={process.env.DEMO_PASSWORD ?? "upay@2026"}
          />

          <Card className="mt-6 bg-surface-2 p-3 text-xs text-muted">
            Every demo account uses the same password, pre-filled above. Roles are enforced by
            row-level security in the database, not only in the interface — signing in as the
            coordinator really does restrict what the queries return.
          </Card>
        </div>
      </div>
    </main>
  );
}
