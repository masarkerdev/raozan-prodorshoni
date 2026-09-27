"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/master/funding", label: "খাত" },
  { href: "/master/demo-types", label: "প্রদর্শনীর ধরন" },
  { href: "/master/allocations", label: "লক্ষ্যমাত্রা" },
  { href: "/master/crops", label: "ফসল ও জাত" },
  { href: "/master/staff", label: "কর্মকর্তা" },
  { href: "/master/blocks", label: "ব্লক" },
  { href: "/master/fiscal-years", label: "অর্থবছর" },
];

export function MasterTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-11 items-center border-b-2 px-4 ${
              active
                ? "border-brand font-semibold text-brand"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
