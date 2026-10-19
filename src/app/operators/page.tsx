import type { Metadata } from "next";
import Link from "next/link";
import { operatorsWithTrips } from "@/lib/queries";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Padel trip organisers" };

export default async function OperatorsPage() {
  const ops = await operatorsWithTrips();
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Organisers</h1>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ops.map((o) => (
          <li key={o.slug}>
            <Link href={`/operators/${o.slug}`} className="block rounded-xl border border-slate-200 p-4 hover:border-court-500">
              <p className="font-semibold">{o.name}</p>
              <p className="text-sm text-muted">{o.trips} upcoming trips</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
