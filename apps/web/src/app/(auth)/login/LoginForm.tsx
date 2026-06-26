"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full border border-cockpit-20 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.2em] text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Memverifikasi…" : "Masuk"}
    </button>
  );
}

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action] = useFormState(signInAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-xs uppercase tracking-[0.25em] text-white/60">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="operator@atrioom.id"
          className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-base text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-red-400/90">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-xs uppercase tracking-[0.25em] text-white/60">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-base text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-red-400/90">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && (
        <p className="text-center text-xs uppercase tracking-[0.2em] text-red-400/90">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}