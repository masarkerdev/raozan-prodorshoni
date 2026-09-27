import Link from "next/link";
import type { Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateBn, toBn } from "@/lib/format";
import { SEASONS, seasonLabel } from "@/lib/demo";
import { REPORT_KINDS, buildReport, type Cell, type ReportKind } from "@/lib/reports";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { inputCls, secondaryBtnCls } from "@/components/ui";

export const dynamic = "force-dynamic";

type SP = Promise<{ type?: string; fy?: string; season?: string }>;

const show = (v: Cell) => (v === null || v === "" ? "—" : typeof v === "number" ? toBn(String(v)) : v);

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const kind: ReportKind = REPORT_KINDS.some((k) => k.value === sp.type) ? (sp.type as ReportKind) : "funding";
  const season = SEASONS.some((s) => s.value === sp.season) ? (sp.season as Season) : undefined;

  const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { startDate: "desc" } });
  const fy = fiscalYears.find((f) => f.id === sp.fy) ?? fiscalYears.find((f) => f.isActive) ?? fiscalYears[0];
  if (!fy) {
    return (
      <>
        <PageHeader title="রিপোর্ট" />
        <p className="text-muted">মাস্টার ডেটায় অর্থবছর যোগ করুন।</p>
      </>
    );
  }

  const report = await buildReport(kind, fy.id, season);
  const qs = (over: Record<string, string>) =>
    new URLSearchParams({ type: kind, fy: fy.id, ...(season && { season }), ...over }).toString();

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="রিপোর্ট"
          actions={
            <>
              <PrintButton />
              <a href={`/reports/export?${qs({})}`} className={secondaryBtnCls}>
                এক্সেল ডাউনলোড
              </a>
            </>
          }
        />

        <nav className="mb-4 flex flex-wrap gap-1 border-b border-line">
          {REPORT_KINDS.map((k) => (
            <Link
              key={k.value}
              href={`/reports?${qs({ type: k.value })}`}
              aria-current={k.value === kind ? "page" : undefined}
              className={`-mb-px flex min-h-11 items-center border-b-2 px-4 ${
                k.value === kind ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {k.label}
            </Link>
          ))}
        </nav>

        <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="type" value={kind} />
          <label className="block text-sm text-muted">
            অর্থবছর
            <select name="fy" defaultValue={fy.id} className={`${inputCls} mt-1 w-44 text-ink`}>
              {fiscalYears.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            মৌসুম
            <select name="season" defaultValue={season ?? ""} className={`${inputCls} mt-1 w-44 text-ink`}>
              <option value="">সকল</option>
              {SEASONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark">
            দেখুন
          </button>
        </form>
      </div>

      {/* প্রিন্টযোগ্য অংশ */}
      <article className="mx-auto max-w-[210mm] rounded-xl border border-line bg-white px-10 py-10 text-[#111] print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="text-center">
          <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
          <div className="font-display text-xl">উপজেলা কৃষি অফিসারের কার্যালয়</div>
          <div>রাউজান, চট্টগ্রাম</div>
        </header>
        <div className="mt-5 flex justify-between border-b-2 border-[#111] pb-2 text-sm">
          <span>স্মারক নং: ..............................</span>
          <span>তারিখ: {formatDateBn(new Date())}</span>
        </div>
        <div className="mt-5 text-center">
          <h1 className="font-display text-lg">{report.title}</h1>
          <p className="text-sm">
            অর্থবছর: {fy.label} · মৌসুম: {season ? seasonLabel(season) : "সকল"}
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#efefea]">
                {report.columns.map((c) => (
                  <th
                    key={c.label}
                    className={`border border-[#111] px-2 py-1.5 font-semibold ${c.numeric ? "text-center" : "text-left"}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={report.columns.length} className="border border-[#111] px-2 py-6 text-center">
                    এই শর্তে কোনো তথ্য নেই।
                  </td>
                </tr>
              )}
              {report.rows.map((row, i) => (
                <tr key={i} className="break-inside-avoid">
                  {row.map((v, j) => (
                    <td
                      key={j}
                      className={`border border-[#111] px-2 py-1.5 ${report.columns[j].numeric || j === 0 ? "text-center" : ""}`}
                    >
                      {show(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {report.rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#efefea] font-bold">
                  {report.totals.map((v, j) => (
                    <td
                      key={j}
                      className={`border border-[#111] px-2 py-1.5 ${report.columns[j].numeric ? "text-center" : ""}`}
                    >
                      {v === null ? "" : show(v)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {report.note && <p className="mt-3 text-sm">দ্রষ্টব্য: {report.note}</p>}

        <div className="mt-20 flex justify-end">
          <div className="min-w-60 border-t border-[#111] pt-2 text-center">
            <div>উপজেলা কৃষি অফিসার</div>
            <div>রাউজান, চট্টগ্রাম</div>
          </div>
        </div>
      </article>
    </>
  );
}
