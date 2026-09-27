"use client";

export function PrintButton({ label = "প্রিন্ট" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d6cfbb] bg-white px-4 text-ink hover:bg-paper print:hidden"
    >
      {label}
    </button>
  );
}
