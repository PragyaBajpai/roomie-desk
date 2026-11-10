"use client";
import { useActionState } from "react";
import { login, type FormState } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="username">Work email</label>
        <input id="username" name="username" type="email" required autoComplete="username" defaultValue={state.username} key={state.username ?? "u"} className="input h-10" placeholder="you@agency.in" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input h-10" />
      </div>
      {state.error && <p className="text-[13px] text-brand-700">{state.error}</p>}
      <button className="btn-primary w-full h-10" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
