import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateBn, toBn } from "@/lib/format";
import { SEASONS, STATUSES } from "@/lib/demo";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { EmptyRow, inputCls, secondaryBtnCls, tdCls, thCls } from "@/components/ui";
import { buildDemoWhere } from "@/lib/demo-query";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SP = Promise<{
  fy?: string;
  season?: string;
  fund?: string;
  union?: string;
  status?: string;
  q?: string;
  page?: string;
  ok?: string;
}>;

export default async function DemonstrationsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  const [fiscalYears, sources, unions] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.fundingSource.findMany({ orderBy: [{ type: "desc" }, { name: "asc" }] }),
    prisma.union.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // অর্থবছর না বাছলে চলতিটা; "all" দিলে সব
  const activeFy = fiscalYears.find((f) => f.isActive);
  const { where, fy, q } = buildDemoWhere(sp, activeFy?.id);
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, rows] = await Promise.all([
    prisma.demonstration.count({ where }),
    prisma.demonstration.findMany({
      where,
      orderBy: [{ fiscalYear: { startDate: "desc" } }, { serialInYear: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        farmer: true,
        block: { include: { union: true } },
        fundingSource: true,
        demoType: true,
        crop: true,
        variety: true,
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, fy, page: String(p) })) {
      if (v && k !== "ok") params.set(k, v);
    }
    return `/demonstrations?${params.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <Flash ok={sp.ok} />
      <PageHeader
        title="প্রদর্শনী রেজিস্টার"
        subtitle={`মোট ${toBn(total)}টি প্রদর্শনী`}
        actions={
          <>
          <a
            href={`/demonstrations/export?${new URLSearchParams(
              Object.fromEntries(Object.entries({ ...sp, fy }).filter(([k, v]) => v && k !== "ok" && k !== "page")) as Record<string, string>,
            ).toString()}`}
            className={secondaryBtnCls}
          >
            এক্সেল ডাউনলোড
          </a>
          <Link
            href="/demonstrations/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
          >
            + নতুন প্রদর্শনী
          </Link>
          </>
        }
      />

      <form
        method="get"
        className="mb-5 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_1.5fr_auto] lg:items-end"
      >
        <label className="block text-sm text-muted">
          অর্থবছর
          <select name="fy" defaultValue={fy} className={`${inputCls} mt-1 text-ink`}>
            <option value="all">সকল</option>
            {fiscalYears.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          মৌসুম
          <select name="season" defaultValue={sp.season ?? ""} className={`${inputCls} mt-1 text-ink`}>
            <option value="">সকল</option>
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          খাত
          <select name="fund" defaultValue={sp.fund ?? ""} className={`${inputCls} mt-1 text-ink`}>
            <option value="">সকল</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName || s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          ইউনিয়ন
          <select name="union" defaultValue={sp.union ?? ""} className={`${inputCls} mt-1 text-ink`}>
            <option value="">সকল</option>
            {unions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          অবস্থা
          <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} mt-1 text-ink`}>
            <option value="">সকল</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          খুঁজুন
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="কৃষক, মোবাইল, গ্রাম বা রেজি. নং"
            className={`${inputCls} mt-1 text-ink`}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark"
          >
            দেখুন
          </button>
          <Link href="/demonstrations?fy=all" className={secondaryBtnCls}>
            রিসেট
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-[#f8f6ef]">
            <tr>
              <th className={`${thCls} pl-4`}>রেজি. নং</th>
              <th className={thCls}>কৃষক</th>
              <th className={thCls}>ইউনিয়ন / ব্লক</th>
              <th className={thCls}>খাত</th>
              <th className={thCls}>প্রদর্শনী · জাত</th>
              <th className={thCls}>আয়তন</th>
              <th className={thCls}>স্থাপন</th>
              <th className={thCls}>অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <EmptyRow colSpan={8}>
                {total === 0 && !q && !sp.season && !sp.fund && !sp.union && !sp.status ? (
                  <>
                    এখনো কোনো প্রদর্শনী যোগ করা হয়নি।{" "}
                    <Link href="/demonstrations/new" className="font-semibold text-brand">
                      প্রথম প্রদর্শনী যোগ করুন
                    </Link>
                  </>
                ) : (
                  "এই শর্তে কোনো প্রদর্শনী পাওয়া যায়নি।"
                )}
              </EmptyRow>
            )}
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-paper">
                <td className={`${tdCls} pl-4 text-sm`}>
                  <Link href={`/demonstrations/${d.id}`} className="font-semibold text-brand">
                    {d.regNo}
                  </Link>
                </td>
                <td className={tdCls}>
                  <div className="font-semibold">{d.farmer.name}</div>
                  <div className="text-sm text-muted">গ্রাম: {d.village}</div>
                </td>
                <td className={tdCls}>
                  {d.block.union.name} / {d.block.name}
                </td>
                <td className={tdCls}>{d.fundingSource.shortName || d.fundingSource.name}</td>
                <td className={tdCls}>
                  <div>{d.demoType.name}</div>
                  <div className="text-sm text-muted">{d.variety ? `${d.crop.name} · ${d.variety.name}` : d.crop.name}</div>
                </td>
                <td className={tdCls}>{toBn(d.areaDecimal.toString())} শতাংশ</td>
                <td className={`${tdCls} text-sm`}>{d.establishedDate ? formatDateBn(d.establishedDate) : "—"}</td>
                <td className={tdCls}>
                  <StatusPill status={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-muted">
          <span>
            {toBn(total)}টির মধ্যে {toBn(from)}–{toBn(to)}
          </span>
          {pages > 1 && (
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className={secondaryBtnCls}>
                  আগে
                </Link>
              )}
              <span className="inline-flex min-h-11 items-center px-2">
                পৃষ্ঠা {toBn(page)} / {toBn(pages)}
              </span>
              {page < pages && (
                <Link href={pageHref(page + 1)} className={secondaryBtnCls}>
                  পরে
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
