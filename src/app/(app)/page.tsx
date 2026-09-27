import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateBn, toBn } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

const pct = (done: number, target: number) => (target > 0 ? Math.min(100, (done / target) * 100) : 0);

function StatCard({ label, value, note, tone }: { label: string; value: string; note?: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-4xl font-bold leading-tight">{value}</div>
      {note && <div className={`mt-1 text-sm ${tone === "warn" ? "text-[#8a5a0e]" : "text-muted"}`}>{note}</div>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const { fy: fyParam } = await searchParams;

  const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { startDate: "desc" } });
  const fy = fiscalYears.find((f) => f.id === fyParam) ?? fiscalYears.find((f) => f.isActive) ?? fiscalYears[0];

  if (!fy) {
    return (
      <>
        <PageHeader title="ড্যাশবোর্ড" />
        <p className="text-muted">মাস্টার ডেটায় অর্থবছর যোগ করুন।</p>
      </>
    );
  }

  const inFy = { fiscalYearId: fy.id };
  const live = { ...inFy, status: { not: "CANCELLED" as const } };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    targetAgg,
    established,
    harvested,
    ongoing,
    needInspection,
    fieldDayAgg,
    results,
    allocByFund,
    demoByFund,
    sources,
    demoByBlock,
    unions,
    recent,
  ] = await Promise.all([
    prisma.allocation.aggregate({ where: inFy, _sum: { targetCount: true } }),
    prisma.demonstration.count({ where: live }),
    prisma.demonstration.count({ where: { ...inFy, status: { in: ["HARVESTED", "COMPLETED"] } } }),
    prisma.demonstration.count({ where: { ...inFy, status: { in: ["ESTABLISHED", "ONGOING"] } } }),
    // চলমান কিন্তু গত ৩০ দিনে পরিদর্শন হয়নি
    prisma.demonstration.count({
      where: {
        ...inFy,
        status: { in: ["ESTABLISHED", "ONGOING"] },
        inspections: { none: { inspectedOn: { gte: thirtyDaysAgo } } },
      },
    }),
    prisma.fieldDay.aggregate({
      where: { demonstration: inFy },
      _count: { _all: true },
      _sum: { maleParticipants: true, femaleParticipants: true },
    }),
    prisma.harvestResult.findMany({
      where: { demonstration: inFy, controlYield: { gt: 0 } },
      select: { demoYield: true, controlYield: true },
    }),
    prisma.allocation.groupBy({ by: ["fundingSourceId"], where: inFy, _sum: { targetCount: true } }),
    prisma.demonstration.groupBy({ by: ["fundingSourceId"], where: live, _count: { _all: true } }),
    prisma.fundingSource.findMany(),
    prisma.demonstration.groupBy({ by: ["blockId"], where: live, _count: { _all: true } }),
    prisma.union.findMany({ orderBy: { sortOrder: "asc" }, include: { blocks: { select: { id: true } } } }),
    prisma.demonstration.findMany({
      where: inFy,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { farmer: true, demoType: true, block: { include: { union: true } } },
    }),
  ]);

  const target = targetAgg._sum.targetCount ?? 0;
  const participants = (fieldDayAgg._sum.maleParticipants ?? 0) + (fieldDayAgg._sum.femaleParticipants ?? 0);

  const avgIncrease =
    results.length > 0
      ? results.reduce((s, r) => {
          const c = Number(r.controlYield);
          return s + ((Number(r.demoYield) - c) / c) * 100;
        }, 0) / results.length
      : null;

  // খাতভিত্তিক অগ্রগতি
  const fundIds = new Set([...allocByFund.map((a) => a.fundingSourceId), ...demoByFund.map((d) => d.fundingSourceId)]);
  const funds = [...fundIds]
    .map((id) => {
      const src = sources.find((s) => s.id === id);
      const t = allocByFund.find((a) => a.fundingSourceId === id)?._sum.targetCount ?? 0;
      const d = demoByFund.find((x) => x.fundingSourceId === id)?._count._all ?? 0;
      return { id, name: src ? src.shortName || src.name : "—", isRevenue: src?.type === "REVENUE", target: t, done: d };
    })
    .sort((a, b) => Number(b.isRevenue) - Number(a.isRevenue) || a.name.localeCompare(b.name, "bn"));

  // ইউনিয়নভিত্তিক
  const blockCount = new Map(demoByBlock.map((b) => [b.blockId, b._count._all]));
  const unionRows = unions.map((u) => ({
    id: u.id,
    name: u.name,
    count: u.blocks.reduce((s, b) => s + (blockCount.get(b.id) ?? 0), 0),
  }));
  const maxUnion = Math.max(1, ...unionRows.map((u) => u.count));

  return (
    <>
      <PageHeader
        title="ড্যাশবোর্ড"
        subtitle={`অর্থবছর ${fy.label}${fy.isActive ? " (চলতি)" : ""}`}
        actions={
          <>
            <div className="flex flex-wrap gap-1.5">
              {fiscalYears.map((f) => (
                <Link
                  key={f.id}
                  href={`/?fy=${f.id}`}
                  aria-current={f.id === fy.id ? "true" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm ${
                    f.id === fy.id ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-paper"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <Link
              href="/demonstrations/new"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
            >
              + নতুন প্রদর্শনী
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white px-5 py-4">
          <div className="text-sm text-muted">স্থাপিত প্রদর্শনী</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold leading-tight">{toBn(established)}</span>
            {target > 0 && <span className="text-sm text-muted">লক্ষ্য {toBn(target)}</span>}
          </div>
          {target > 0 ? (
            <div className="mt-2 h-1.5 rounded-full bg-[#eae5d6]">
              <div className="h-1.5 rounded-full bg-brand" style={{ width: `${pct(established, target)}%` }} />
            </div>
          ) : (
            <Link href={`/master/allocations?fy=${fy.id}`} className="mt-1 block text-sm text-brand">
              লক্ষ্যমাত্রা যোগ করুন
            </Link>
          )}
        </div>
        <StatCard
          label="কর্তন সম্পন্ন"
          value={toBn(harvested)}
          note={avgIncrease !== null ? `গড় ফলন বৃদ্ধি ${toBn(avgIncrease.toFixed(1))}%` : undefined}
        />
        <StatCard
          label="চলমান"
          value={toBn(ongoing)}
          tone={needInspection > 0 ? "warn" : undefined}
          note={
            needInspection > 0 ? (
              <Link href={`/demonstrations?fy=${fy.id}`} className="underline">
                {toBn(needInspection)}টিতে ৩০ দিনে পরিদর্শন হয়নি
              </Link>
            ) : ongoing > 0 ? (
              "সবগুলোর নিয়মিত পরিদর্শন হচ্ছে"
            ) : undefined
          }
        />
        <StatCard
          label="মাঠ দিবস"
          value={toBn(fieldDayAgg._count._all)}
          note={participants > 0 ? `অংশগ্রহণকারী ${toBn(participants.toLocaleString("en-IN"))} জন` : undefined}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">খাতভিত্তিক অগ্রগতি</h2>
            {funds.length === 0 ? (
              <p className="text-muted">এই অর্থবছরে এখনো কোনো লক্ষ্যমাত্রা বা প্রদর্শনী নেই।</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-muted">
                    <th className="border-b border-line pb-2 font-semibold">খাত</th>
                    <th className="w-16 border-b border-line pb-2 font-semibold">লক্ষ্য</th>
                    <th className="w-16 border-b border-line pb-2 font-semibold">স্থাপিত</th>
                    <th className="border-b border-line pb-2 font-semibold">অগ্রগতি</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((f) => (
                    <tr key={f.id}>
                      <td className="py-2 pr-2 font-semibold">{f.name}</td>
                      <td className="py-2">{f.target ? toBn(f.target) : "—"}</td>
                      <td className="py-2">{toBn(f.done)}</td>
                      <td className="py-2">
                        {f.target > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-[#eae5d6]">
                              <div
                                className="h-2 rounded-full bg-brand"
                                style={{ width: `${pct(f.done, f.target)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-sm text-muted">
                              {toBn(Math.round((f.done / f.target) * 100))}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted">লক্ষ্যমাত্রা নেই</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="mb-2 text-lg font-bold">সাম্প্রতিক হালনাগাদ</h2>
            {recent.length === 0 ? (
              <p className="text-muted">
                এখনো কোনো প্রদর্শনী নেই।{" "}
                <Link href="/demonstrations/new" className="font-semibold text-brand">
                  প্রথম প্রদর্শনী যোগ করুন
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-[#f0ece0]">
                {recent.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="w-28 text-sm text-muted">{formatDateBn(d.updatedAt)}</span>
                    <Link href={`/demonstrations/${d.id}`} className="font-semibold text-brand">
                      {d.regNo}
                    </Link>
                    <span className="flex-1">
                      {d.demoType.name} — {d.farmer.name} ({d.block.union.name})
                    </span>
                    <StatusPill status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-bold">ইউনিয়নভিত্তিক প্রদর্শনী</h2>
          <ul className="space-y-2">
            {unionRows.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/demonstrations?fy=${fy.id}&union=${u.id}`}
                  className="grid grid-cols-[120px_1fr_36px] items-center gap-2.5 rounded-md hover:bg-paper"
                >
                  <span>{u.name}</span>
                  <span className="h-3.5 rounded-sm bg-paper">
                    <span
                      className="block h-3.5 rounded-sm bg-ochre"
                      style={{ width: `${(u.count / maxUnion) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold">{toBn(u.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
