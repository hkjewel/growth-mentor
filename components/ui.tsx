import { CATEGORY_LABELS, TIMEFRAME_LABELS, type Category, type Timeframe } from "@/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <p className="font-semibold text-neutral-900">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-neutral-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const CATEGORY_STYLES: Record<Category, string> = {
  health: "bg-rose-50 text-rose-700 ring-rose-200",
  soft_skill: "bg-amber-50 text-amber-800 ring-amber-200",
  education: "bg-sky-50 text-sky-700 ring-sky-200",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  health: "#e11d48",
  soft_skill: "#d97706",
  education: "#0284c7",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_STYLES[category] ?? "bg-neutral-100 text-neutral-700 ring-neutral-200"}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export function TimeframeBadge({ timeframe }: { timeframe: Timeframe }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">
      {TIMEFRAME_LABELS[timeframe] ?? timeframe}
    </span>
  );
}

export function scoreColor(score: number | null | undefined) {
  if (score == null) return "text-neutral-400";
  if (score >= 8) return "text-brand-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

export function ScoreRing({ score, size = 88 }: { score: number | null; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(1, score / 10));
  const stroke = score == null ? "#d4d4d4" : score >= 8 ? "#1fa06d" : score >= 6 ? "#d97706" : "#dc2626";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceeea" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`text-xl font-bold tabular-nums ${scoreColor(score)}`}>{score == null ? "—" : score.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function TrendBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-xs text-neutral-400">First review</span>;
  const up = delta > 0;
  const flat = Math.abs(delta) < 0.3;
  const cls = flat ? "bg-neutral-100 text-neutral-600" : up ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {flat ? "→" : up ? "▲" : "▼"} {delta > 0 ? "+" : ""}
      {delta.toFixed(1)} vs last review
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{value}</p>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}
