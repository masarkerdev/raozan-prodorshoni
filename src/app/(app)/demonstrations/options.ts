import { prisma } from "@/lib/prisma";
import type { DemoFormOptions } from "./DemoForm";

/**
 * ফর্মের ড্রপডাউনের তথ্য। শুধু সক্রিয়গুলো আসে; সম্পাদনার সময়
 * প্রদর্শনীতে আগে থেকে ব্যবহৃত (এখন নিষ্ক্রিয়) ধরনও রাখা হয়।
 */
export async function loadDemoFormOptions(keepDemoTypeId?: string): Promise<DemoFormOptions> {
  const [fiscalYears, demoTypes, crops, unions] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.demoType.findMany({
      where: {
        OR: [{ isActive: true, fundingSource: { isActive: true } }, ...(keepDemoTypeId ? [{ id: keepDemoTypeId }] : [])],
      },
      include: { fundingSource: true },
      orderBy: [{ fundingSource: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.crop.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { varieties: { orderBy: { name: "asc" } } },
    }),
    prisma.union.findMany({
      orderBy: { sortOrder: "asc" },
      include: { blocks: { orderBy: { name: "asc" }, include: { staff: true } } },
    }),
  ]);

  return {
    fiscalYears: fiscalYears.map((f) => ({ id: f.id, label: f.label })),
    demoTypes: demoTypes.map((d) => ({
      id: d.id,
      name: d.name,
      fundingName: d.fundingSource.shortName || d.fundingSource.name,
      defaultAreaDec: d.defaultAreaDec?.toString() ?? null,
      defaultBudget: d.defaultBudget?.toString() ?? null,
    })),
    crops: crops.map((c) => ({
      id: c.id,
      name: c.name,
      varieties: c.varieties.map((v) => ({ id: v.id, name: v.name })),
    })),
    unions: unions.map((u) => ({
      id: u.id,
      name: u.name,
      blocks: u.blocks.map((b) => ({ id: b.id, name: b.name, staffName: b.staff?.name ?? null })),
    })),
  };
}
