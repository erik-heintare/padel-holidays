"use client";

import { useState } from "react";

/** Posts a form to a JSON endpoint and swaps in a thank-you message on success. */
export function AjaxForm({
  action,
  children,
  success,
  submitLabel,
  className,
}: {
  action: string;
  children: React.ReactNode;
  success: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch(action, { method: "POST", body: new FormData(e.currentTarget) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Something went wrong");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  if (state === "done") return <div className="rounded-xl bg-court-50 p-4 text-sm text-court-900">{success}</div>;

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full disabled:opacity-60">
        {state === "sending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
