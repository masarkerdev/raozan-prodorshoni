import type { Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const REPORT_KINDS = [
  { value: "funding", label: "খাতভিত্তিক" },
  { value: "union", label: "ইউনিয়নভিত্তিক" },
  { value: "crop", label: "ফসলভিত্তিক" },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]["value"];
export type Cell = string | number | null;

export type Report = {
  title: string;
  columns: { label: string; numeric?: boolean; width?: number }[];
  rows: Cell[][];
  totals: Cell[];
  note?: string;
};

type Demo = Awaited<ReturnType<typeof loadDemos>>[number];

function loadDemos(fiscalYearId: string, season?: Season) {
  return prisma.demonstration.findMany({
    where: { fiscalYearId, ...(season && { season }), status: { not: "CANCELLED" } },
    select: {
      demoTypeId: true,
      cropId: true,
      status: true,
      areaDecimal: true,
      block: { select: { unionId: true } },
      result: { select: { demoYield: true, controlYield: true } },
      fieldDays: { select: { maleParticipants: true, femaleParticipants: true } },
    },
  });
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** একগুচ্ছ প্রদর্শনীর সারসংক্ষেপ */
function summarize(list: Demo[]) {
  const withControl = list.filter((d) => d.result && Number(d.result.controlYield) > 0);
  const inc = withControl.length
    ? withControl.reduce((s, d) => {
        const c = Number(d.result!.controlYield);
        return s + ((Number(d.result!.demoYield) - c) / c) * 100;
      }, 0) / withControl.length
    : null;
  return {
    established: list.length,
    area: round(list.reduce((s, d) => s + Number(d.areaDecimal), 0), 2),
    harvested: list.filter((d) => d.status === "HARVESTED" || d.status === "COMPLETED").length,
    increase: inc === null ? null : round(inc, 1),
    fieldDays: list.reduce((s, d) => s + d.fieldDays.length, 0),
    participants: list.reduce(
      (s, d) => s + d.fieldDays.reduce((t, f) => t + f.maleParticipants + f.femaleParticipants, 0),
      0,
    ),
  };
}

export async function buildReport(kind: ReportKind, fiscalYearId: string, season?: Season): Promise<Report> {
  const demos = await loadDemos(fiscalYearId, season);
  const all = summarize(demos);

  if (kind === "union") {
    const unions = await prisma.union.findMany({ orderBy: { sortOrder: "asc" } });
    const rows = unions.map((u, i) => {
      const s = summarize(demos.filter((d) => d.block.unionId === u.id));
      return [i + 1, u.name, s.established, s.area, s.harvested, s.increase, s.fieldDays, s.participants];
    });
    return {
      title: "ইউনিয়নভিত্তিক প্রদর্শনী বাস্তবায়ন প্রতিবেদন",
      columns: [
        { label: "ক্র.", width: 6 },
        { label: "ইউনিয়ন / পৌরসভা", width: 22 },
        { label: "স্থাপিত", numeric: true, width: 10 },
        { label: "আয়তন (শতাংশ)", numeric: true, width: 14 },
        { label: "কর্তন", numeric: true, width: 10 },
        { label: "গড় ফলন বৃদ্ধি (%)", numeric: true, width: 16 },
        { label: "মাঠ দিবস", numeric: true, width: 10 },
        { label: "অংশগ্রহণকারী", numeric: true, width: 14 },
      ],
      rows,
      totals: [null, "সর্বমোট", all.established, all.area, all.harvested, all.increase, all.fieldDays, all.participants],
    };
  }

  if (kind === "crop") {
    const crops = await prisma.crop.findMany({ where: { id: { in: [...new Set(demos.map((d) => d.cropId))] } } });
    crops.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "", "bn") || a.name.localeCompare(b.name, "bn"));
    const rows = crops.map((c, i) => {
      const s = summarize(demos.filter((d) => d.cropId === c.id));
      return [i + 1, c.name, c.category ?? "", s.established, s.area, s.harvested, s.increase, s.fieldDays];
    });
    return {
      title: "ফসলভিত্তিক প্রদর্শনী বাস্তবায়ন প্রতিবেদন",
      columns: [
        { label: "ক্র.", width: 6 },
        { label: "ফসল", width: 20 },
        { label: "শ্রেণি", width: 12 },
        { label: "স্থাপিত", numeric: true, width: 10 },
        { label: "আয়তন (শতাংশ)", numeric: true, width: 14 },
        { label: "কর্তন", numeric: true, width: 10 },
        { label: "গড় ফলন বৃদ্ধি (%)", numeric: true, width: 16 },
        { label: "মাঠ দিবস", numeric: true, width: 10 },
      ],
      rows,
      totals: [null, "সর্বমোট", null, all.established, all.area, all.harvested, all.increase, all.fieldDays],
    };
  }

  // খাতভিত্তিক (ডিফল্ট): প্রদর্শনীর ধরন অনুযায়ী লক্ষ্য বনাম অর্জন
  const allocations = await prisma.allocation.findMany({
    where: { fiscalYearId, ...(season && { season }) },
    select: { demoTypeId: true, targetCount: true },
  });
  const typeIds = [...new Set([...allocations.map((a) => a.demoTypeId), ...demos.map((d) => d.demoTypeId)])];
  const types = await prisma.demoType.findMany({ where: { id: { in: typeIds } }, include: { fundingSource: true } });
  types.sort(
    (a, b) =>
      Number(b.fundingSource.type === "REVENUE") - Number(a.fundingSource.type === "REVENUE") ||
      a.fundingSource.name.localeCompare(b.fundingSource.name, "bn") ||
      a.name.localeCompare(b.name, "bn"),
  );

  let totalTarget = 0;
  const rows = types.map((t, i) => {
    const target = allocations.filter((a) => a.demoTypeId === t.id).reduce((s, a) => s + a.targetCount, 0);
    totalTarget += target;
    const s = summarize(demos.filter((d) => d.demoTypeId === t.id));
    return [
      i + 1,
      t.fundingSource.shortName || t.fundingSource.name,
      t.name,
      target || null,
      s.established,
      s.area,
      s.harvested,
      s.increase,
      s.fieldDays,
    ];
  });

  return {
    title: "খাতভিত্তিক প্রদর্শনী বাস্তবায়ন প্রতিবেদন",
    columns: [
      { label: "ক্র.", width: 6 },
      { label: "খাত", width: 18 },
      { label: "প্রদর্শনীর ধরন", width: 30 },
      { label: "লক্ষ্য", numeric: true, width: 9 },
      { label: "স্থাপিত", numeric: true, width: 9 },
      { label: "আয়তন (শতাংশ)", numeric: true, width: 13 },
      { label: "কর্তন", numeric: true, width: 9 },
      { label: "গড় ফলন বৃদ্ধি (%)", numeric: true, width: 15 },
      { label: "মাঠ দিবস", numeric: true, width: 10 },
    ],
    rows,
    totals: [null, null, "সর্বমোট", totalTarget || null, all.established, all.area, all.harvested, all.increase, all.fieldDays],
    note: "ফলন বৃদ্ধির হার পার্শ্ববর্তী (কন্ট্রোল) জমির ফলনের তুলনায় হিসাব করা হয়েছে। বাতিল প্রদর্শনী হিসাবে ধরা হয়নি।",
  };
}
