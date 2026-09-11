export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-neutral-200" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-neutral-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-200/70" />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-2xl bg-neutral-200/70" />
    </div>
  );
}
