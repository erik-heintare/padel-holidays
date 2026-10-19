/**
 * Emails the site owner via Resend when RESEND_API_KEY and NOTIFY_EMAIL are set; otherwise a no-op.
 * Failures are logged, never thrown: a lost notification must not lose the lead itself.
 */
export async function notifyOwner(subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM ?? "Padel Holidays <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("notifyOwner failed", res.status, await res.text());
  } catch (err) {
    console.error("notifyOwner failed", err);
  }
}
