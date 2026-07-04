"use client";

import { useActionState } from "react";
import { claimDirector } from "@/app/actions";

export default function SetupDirectorPage() {
  const [state, formAction, pending] = useActionState(claimDirector, null);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Director setup</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Enter the director setup code configured for this deployment to grant
          your signed-in account the director role. This removes any existing
          student or faculty identity from the account.
        </p>
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Setup code
            </label>
            <input
              id="code"
              name="code"
              type="password"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Become director"}
          </button>
        </form>
      </div>
    </main>
  );
}
