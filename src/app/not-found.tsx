import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl font-bold">Out of the court</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist, or the trip has been removed.</p>
      <Link href="/trips" className="btn-primary mt-6">Browse trips</Link>
    </div>
  );
}
