"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <p className="text-lg font-semibold text-red-800">Could not load this page</p>
      <p className="mt-1 text-sm text-red-700">
        {error.message?.startsWith("Could not") ? error.message : "The database may be unreachable — please try again."}
      </p>
      <button type="button" onClick={reset} className="btn btn-secondary mt-5">
        Retry
      </button>
    </div>
  );
}
