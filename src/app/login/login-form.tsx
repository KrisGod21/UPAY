"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { signIn, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@upay.org", blurb: "Every zone and centre", emoji: "🗺", tone: "bg-sky text-sky-ink" },
  { role: "Coordinator", email: "coordinator@upay.org", blurb: "Scoped to Nagpur Central", emoji: "🧭", tone: "bg-lilac text-lilac-ink" },
  { role: "Teacher", email: "teacher@upay.org", blurb: "Curriculum and progress", emoji: "📚", tone: "bg-butter text-butter-ink" },
  { role: "Volunteer", email: "volunteer@upay.org", blurb: "Attendance and check-in", emoji: "🤝", tone: "bg-mint text-mint-ink" },
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
          <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Demo accounts — tap to fill
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(demoPassword);
              }}
              className={`press flex items-center gap-3 rounded-card p-3 text-left transition-transform hover:-translate-y-0.5 ${a.tone}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/60 text-sm dark:bg-white/10" aria-hidden>
                {a.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{a.role}</span>
                <span className="block truncate text-xs opacity-80">{a.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
