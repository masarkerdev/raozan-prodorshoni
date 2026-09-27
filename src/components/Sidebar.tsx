"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "ড্যাশবোর্ড" },
  { href: "/demonstrations", label: "প্রদর্শনী রেজিস্টার" },
  { href: "/reports", label: "রিপোর্ট" },
  { href: "/master", label: "মাস্টার ডেটা", adminOnly: true },
  { href: "/users", label: "ব্যবহারকারী", adminOnly: true },
];

export function Sidebar({ name, role }: { name: string; role: "ADMIN" | "OPERATOR" }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex w-62 shrink-0 flex-col gap-7 bg-brand px-4.5 py-7 text-white print:hidden">
      <div className="px-2.5">
        <div className="font-display text-2xl leading-snug">প্রদর্শনী রেজিস্টার</div>
        <div className="text-sm text-[#d4e4da]">উপজেলা কৃষি অফিস, রাউজান</div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.filter((item) => !item.adminOnly || role === "ADMIN").map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-base ${
                active
                  ? "bg-brand-light font-semibold text-white"
                  : "text-[#e6efe9] hover:bg-brand-dark"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#3f7e63] px-3 pt-3.5">
        <Link href="/account" className="font-semibold text-white hover:underline">
          {name}
        </Link>
        <div className="text-sm text-[#d4e4da]">{role === "ADMIN" ? "অ্যাডমিন" : "অপারেটর"}</div>
        <form action={signOut} className="mt-3 flex gap-2">
          <Link
            href="/account"
            className="inline-flex min-h-10 items-center rounded-md border border-[#3f7e63] px-3 text-sm text-[#e6efe9] hover:bg-brand-dark"
          >
            পাসওয়ার্ড
          </Link>
          <button
            type="submit"
            className="min-h-10 rounded-md border border-[#3f7e63] px-3 text-sm text-[#e6efe9] hover:bg-brand-dark"
          >
            লগআউট
          </button>
        </form>
      </div>
    </aside>
  );
}
