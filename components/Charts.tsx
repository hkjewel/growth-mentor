/** Dependency-free SVG charts (server-renderable). */

export type Series = { label: string; color: string; points: (number | null)[] };

export function LineChart({
  labels,
  series,
  height = 200,
  yMax = 10,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  yMax?: number;
}) {
  const W = 600;
  const H = height;
  const pad = { l: 28, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => pad.t + ih - (v / yMax) * ih;
  const ticks = [0, 2, 4, 6, 8, 10].filter((t) => t <= yMax);
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Score trend chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#eceeea" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8a918d">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#8a918d">
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const pts = s.points.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)));
          // break the line at gaps
          const segments: (readonly [number, number])[][] = [];
          let cur: (readonly [number, number])[] = [];
          for (const p of pts) {
            if (p) cur.push(p);
            else if (cur.length) {
              segments.push(cur);
              cur = [];
            }
          }
          if (cur.length) segments.push(cur);
          return (
            <g key={s.label}>
              {segments.map((seg, i) => (
                <polyline
                  key={i}
                  points={seg.map(([a, b]) => `${a},${b}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {pts.map((p, i) =>
                p ? (
                  <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2}>
                    <title>{`${s.label} · ${labels[i]}: ${s.points[i]}`}</title>
                  </circle>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-600">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tiny bars for a list of scores (oldest → newest). */
export function Sparkbars({ values, max = 10 }: { values: (number | null)[]; max?: number }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-2 rounded-sm ${v == null ? "bg-neutral-200" : v >= 8 ? "bg-brand-500" : v >= 6 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ height: `${v == null ? 12 : Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function HBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}
