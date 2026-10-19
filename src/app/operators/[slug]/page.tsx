import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripGrid } from "@/components/TripCard";
import { getOperator, listTrips } from "@/lib/queries";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const op = await getOperator((await params).slug);
  return op ? { title: `${op.name}: padel camps and holidays`, alternates: { canonical: `/operators/${op.slug}` } } : {};
}

export default async function OperatorPage({ params }: Props) {
  const op = await getOperator((await params).slug);
  if (!op) notFound();
  const result = await listTrips({ operatorId: op.id });
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">{op.name}</h1>
      <p className="mt-1 text-muted">{op.domain} · {result.total} upcoming trips</p>
      <div className="mt-8">
        {result.trips.length > 0 ? <TripGrid trips={result.trips} /> : <p className="text-muted">No upcoming trips listed right now.</p>}
      </div>
    </div>
  );
}
