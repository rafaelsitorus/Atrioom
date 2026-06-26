"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/(auth)/login/actions";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full border border-cockpit-10 bg-white/5 px-4 py-2.5 text-left text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {pending ? "Keluar…" : "Logout"}
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Inner />
    </form>
  );
}