import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: padel camps, clinics and holidays`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-bold tracking-tight">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-ball text-court-900">●</span>
              <span>{site.name}</span>
            </Link>
            <nav className="flex items-center gap-1 whitespace-nowrap text-sm font-medium sm:gap-4">
              <Link href="/trips" className="rounded-full px-2 py-2 hover:text-court-600 sm:px-3">All trips</Link>
              <Link href="/destinations" className="hidden rounded-full px-3 py-2 hover:text-court-600 sm:inline">Destinations</Link>
              <Link href="/list-your-trip" className="btn-ball !px-3 !py-2 sm:!px-4"><span className="sm:hidden">List trip</span><span className="hidden sm:inline">List your trip</span></Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-slate-200 bg-slate-50 py-10 text-sm text-muted">
          <div className="container-page grid gap-6 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <p className="font-semibold text-ink">{site.name}</p>
              <p className="mt-2 max-w-md">
                We search the web every day for padel camps, clinics and holidays, so you can compare them in one place.
                Booking happens on the organiser&apos;s own site. Some links earn us a commission, at no cost to you.
              </p>
            </div>
            <ul className="space-y-2">
              <li><Link href="/trips" className="hover:text-ink">All trips</Link></li>
              <li><Link href="/destinations" className="hover:text-ink">Destinations</Link></li>
              <li><Link href="/operators" className="hover:text-ink">Organisers</Link></li>
            </ul>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-ink">About and disclosure</Link></li>
              <li><Link href="/list-your-trip" className="hover:text-ink">For organisers</Link></li>
              <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
