import { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

const CHIP_STYLES: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  absent: "bg-rose-50 text-rose-700 ring-rose-600/20",
  on_leave: "bg-amber-50 text-amber-700 ring-amber-600/20",
  open: "bg-sky-50 text-sky-700 ring-sky-600/20",
  finalized: "bg-slate-100 text-slate-600 ring-slate-500/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cleared: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  fail: "bg-rose-50 text-rose-700 ring-rose-600/20",
  empty: "bg-slate-50 text-slate-500 ring-slate-400/20",
};

export function Chip({ kind, label }: { kind: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        CHIP_STYLES[kind] ?? CHIP_STYLES.empty
      }`}
    >
      {label ?? kind.replace("_", " ")}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

export function Td({ children }: { children?: ReactNode }) {
  return <td className="px-3 py-2.5 text-sm text-slate-700">{children}</td>;
}
