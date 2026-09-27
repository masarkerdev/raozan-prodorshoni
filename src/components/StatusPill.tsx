import { statusInfo } from "@/lib/demo";

export function StatusPill({ status }: { status: string }) {
  const s = statusInfo(status);
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
