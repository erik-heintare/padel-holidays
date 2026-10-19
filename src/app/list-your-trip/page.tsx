import type { Metadata } from "next";
import { AjaxForm } from "@/components/AjaxForm";

export const metadata: Metadata = {
  title: "List or feature your padel trip",
  description: "Run padel camps or holidays? Get your trips in front of players planning their next padel getaway.",
};

export default function ListYourTripPage() {
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold">For organisers</h1>
        <p className="mt-3 text-slate-700">
          Padel Holidays lists padel camps, clinics and holidays from organisers worldwide. Basic listings are free: our
          research agent finds public trips on its own, and you can also point us to yours.
        </p>
        <ul className="mt-6 space-y-4">
          {[
            ["Free listing", "Your public trips, with dates and prices, linking straight to your booking page."],
            ["Featured placement", "Top of search results and the home page, plus a highlighted card. Paid monthly."],
            ["Referral partnership", "Pay a commission only on bookings we send you. We share click and enquiry stats every month."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl bg-court-50 p-4">
              <p className="font-semibold text-court-900">{t}</p>
              <p className="text-sm text-slate-600">{d}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold">Get in touch</h2>
        <AjaxForm
          action="/api/listing-requests"
          submitLabel="Send"
          className="mt-4 space-y-3"
          success={<p>Thanks! We&apos;ll reply within two working days.</p>}
        >
          <input type="text" name="phone_number" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div><label className="label" htmlFor="company">Company</label><input id="company" name="company" required className="field" /></div>
          <div><label className="label" htmlFor="contact_name">Your name</label><input id="contact_name" name="contact_name" required className="field" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
          <div><label className="label" htmlFor="website">Website</label><input id="website" name="website" type="url" required placeholder="https://" className="field" /></div>
          <div><label className="label" htmlFor="message">What would you like?</label><textarea id="message" name="message" rows={4} className="field" /></div>
        </AjaxForm>
      </div>
    </div>
  );
}
