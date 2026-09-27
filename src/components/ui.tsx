import Link from "next/link";

export const inputCls =
  "min-h-11 w-full rounded-lg border border-[#d6cfbb] bg-white px-3 text-base outline-none focus:border-brand";

export const secondaryBtnCls =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d6cfbb] bg-white px-4 text-ink hover:bg-paper";

export const smallBtnCls =
  "inline-flex min-h-9 items-center rounded-md border border-[#d6cfbb] bg-white px-3 text-sm text-ink hover:bg-paper";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-semibold text-brand">সক্রিয়</span>
  ) : (
    <span className="rounded-full bg-[#ecebe6] px-2.5 py-0.5 text-sm font-semibold text-[#55554d]">নিষ্ক্রিয়</span>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

export function CancelLink({ href }: { href: string }) {
  return (
    <Link href={href} className={secondaryBtnCls}>
      বাতিল
    </Link>
  );
}

export const thCls = "border-b border-line py-2 pr-3 text-sm font-semibold text-muted";
export const tdCls = "border-b border-[#f0ece0] py-2.5 pr-3 align-middle";
