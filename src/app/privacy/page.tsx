import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        <p>We collect as little as we can.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Click-throughs:</strong> when you click through to an organiser, we record which trip it was, the
            referring page and your country (taken from your IP address, which we don&apos;t store). We use this to report
            referral numbers to organisers.
          </li>
          <li>
            <strong>Enquiries:</strong> when you send an enquiry, we store your name, email and message so we can answer
            you and pass your question to the organiser. Email us to have it deleted at any time.
          </li>
          <li>We don&apos;t use advertising cookies, and we don&apos;t sell personal data.</li>
        </ul>
      </div>
    </div>
  );
}
