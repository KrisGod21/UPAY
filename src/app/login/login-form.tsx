"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { signIn, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@upay.org", blurb: "Sees every zone and centre" },
  { role: "Coordinator", email: "coordinator@upay.org", blurb: "Scoped to Nagpur Central" },
  { role: "Teacher", email: "teacher@upay.org", blurb: "Curriculum and progress" },
  { role: "Volunteer", email: "volunteer@upay.org", blurb: "Attendance and check-in" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : (<><LogIn /> Sign in</>)}
    </Button>
  );
}

export function LoginForm({ next, demoPassword }: { next: string; demoPassword: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {});
  const [email, setEmail] = useState("admin@upay.org");
  const [password, setPassword] = useState(demoPassword);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@upay.org"
            required
          />
        </Field>

        <Field label="Password">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {state.error ? (
          <p className="flex items-start gap-2 rounded-[--radius-base] bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Demo accounts — click to fill
        </p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(demoPassword);
              }}
              className="flex items-center justify-between rounded-[--radius-base] border border-border bg-surface px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span>
                <span className="font-medium">{a.role}</span>
                <span className="ml-2 text-xs text-muted">{a.blurb}</span>
              </span>
              <span className="text-xs text-muted">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
