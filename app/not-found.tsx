import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-lg px-6 py-12 text-center">
      <p className="text-lg font-semibold text-neutral-900">Not found</p>
      <p className="mt-1 text-sm text-neutral-500">This item may have been deleted.</p>
      <Link href="/" className="btn btn-primary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
}
