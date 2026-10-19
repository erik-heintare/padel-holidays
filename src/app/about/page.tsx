import type { Metadata } from "next";

export const metadata: Metadata = { title: "About and affiliate disclosure" };

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">About Padel Holidays</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        <p>
          Padel Holidays brings padel camps, clinics, holidays and tournament trips from across the web together in one
          place. An AI research agent searches organiser websites every day, records the dates, prices and details of
          each trip, and links back to the original page. Automated checks then remove trips that have passed or whose
          pages have disappeared.
        </p>
        <p>
          Because the listings are gathered automatically, details can change. Always confirm dates, prices and what&apos;s
          included with the organiser before you book.
        </p>
        <h2 className="pt-4 text-xl font-bold text-ink">How we make money</h2>
        <p>
          Using Padel Holidays is free. When you click through to an organiser, we may earn a referral commission if you
          book. That never changes the price you pay. Organisers can also pay for featured placement, and those trips are
          always labelled &ldquo;Featured&rdquo;. Every other trip is ordered by date.
        </p>
        <p>
          If you send an enquiry through our form, we pass your question to the organiser and reply to you by email.
        </p>
      </div>
    </div>
  );
}
