"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type FundingType, type Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// ---------------------------------------------------------------
// সহায়ক ফাংশন
// ---------------------------------------------------------------

class ActionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

/** বাংলা বা ইংরেজি অঙ্ক দুটোই গ্রহণ করে; কমা বাদ দেয় */
function optNum(fd: FormData, key: string): number | null {
  const raw = str(fd, key)
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/,/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new ActionError("invalid");
  return n;
}

function mapError(e: unknown): string {
  if (e instanceof ActionError) return e.code;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "duplicate";
    if (e.code === "P2003") return "inuse";
  }
  console.error(e);
  return "unknown";
}

/** অ্যাডমিন যাচাই → কাজ → ফলাফলসহ একই পেজে ফেরত */
async function run(path: string, fn: () => Promise<unknown>, okCode = "saved") {
  await requireAdmin();
  let err: string | null = null;
  try {
    await fn();
  } catch (e) {
    err = mapError(e);
  }
  const sep = path.includes("?") ? "&" : "?";
  if (err) redirect(`${path}${sep}err=${err}`);
  revalidatePath(path.split("?")[0]);
  redirect(`${path}${sep}ok=${okCode}`);
}

// ---------------------------------------------------------------
// খাত (প্রকল্প / রাজস্ব)
// ---------------------------------------------------------------

export async function saveFundingSource(fd: FormData) {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const type = str(fd, "type");
  const shortName = optStr(fd, "shortName");

  await run("/master/funding", async () => {
    if (!name || (type !== "PROJECT" && type !== "REVENUE")) throw new ActionError("required");
    const data = { name, shortName, type: type as FundingType };
    if (id) await prisma.fundingSource.update({ where: { id }, data });
    else await prisma.fundingSource.create({ data });
  });
}

export async function toggleFundingSource(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/funding",
    async () => {
      const row = await prisma.fundingSource.findUniqueOrThrow({ where: { id } });
      await prisma.fundingSource.update({ where: { id }, data: { isActive: !row.isActive } });
    },
    "updated",
  );
}

// ---------------------------------------------------------------
// প্রদর্শনীর ধরন
// ---------------------------------------------------------------

export async function saveDemoType(fd: FormData) {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const fundingSourceId = str(fd, "fundingSourceId");

  await run("/master/demo-types", async () => {
    if (!name || !fundingSourceId) throw new ActionError("required");
    const data = {
      name,
      fundingSourceId,
      defaultAreaDec: optNum(fd, "defaultAreaDec"),
      defaultBudget: optNum(fd, "defaultBudget"),
    };
    if (id) await prisma.demoType.update({ where: { id }, data });
    else await prisma.demoType.create({ data });
  });
}

export async function toggleDemoType(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/demo-types",
    async () => {
      const row = await prisma.demoType.findUniqueOrThrow({ where: { id } });
      await prisma.demoType.update({ where: { id }, data: { isActive: !row.isActive } });
    },
    "updated",
  );
}

// ---------------------------------------------------------------
// ফসল ও জাত
// ---------------------------------------------------------------

export async function saveCrop(fd: FormData) {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const category = optStr(fd, "category");

  await run(id ? `/master/crops?crop=${id}` : "/master/crops", async () => {
    if (!name) throw new ActionError("required");
    if (id) await prisma.crop.update({ where: { id }, data: { name, category } });
    else await prisma.crop.create({ data: { name, category } });
  });
}

export async function deleteCrop(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/crops",
    async () => {
      await prisma.crop.delete({ where: { id } });
    },
    "deleted",
  );
}

export async function saveVariety(fd: FormData) {
  const cropId = str(fd, "cropId");
  const name = str(fd, "name");

  await run(`/master/crops?crop=${cropId}`, async () => {
    if (!cropId || !name) throw new ActionError("required");
    await prisma.variety.create({ data: { cropId, name } });
  });
}

export async function deleteVariety(fd: FormData) {
  const id = str(fd, "id");
  const cropId = str(fd, "cropId");
  await run(
    `/master/crops?crop=${cropId}`,
    async () => {
      await prisma.variety.delete({ where: { id } });
    },
    "deleted",
  );
}

// ---------------------------------------------------------------
// কর্মকর্তা
// ---------------------------------------------------------------

export async function saveStaff(fd: FormData) {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const designation = str(fd, "designation") || "উপসহকারী কৃষি কর্মকর্তা";
  const mobile = optStr(fd, "mobile");

  await run("/master/staff", async () => {
    if (!name) throw new ActionError("required");
    const data = { name, designation, mobile };
    if (id) await prisma.staff.update({ where: { id }, data });
    else await prisma.staff.create({ data });
  });
}

export async function toggleStaff(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/staff",
    async () => {
      const row = await prisma.staff.findUniqueOrThrow({ where: { id } });
      await prisma.staff.update({ where: { id }, data: { isActive: !row.isActive } });
    },
    "updated",
  );
}

// ---------------------------------------------------------------
// ব্লক
// ---------------------------------------------------------------

export async function saveBlock(fd: FormData) {
  const id = str(fd, "id");
  const unionId = str(fd, "unionId");
  const name = str(fd, "name");
  const staffId = optStr(fd, "staffId");

  await run("/master/blocks", async () => {
    if (!unionId || !name) throw new ActionError("required");
    const data = { unionId, name, staffId };
    if (id) await prisma.block.update({ where: { id }, data });
    else await prisma.block.create({ data });
  });
}

export async function deleteBlock(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/blocks",
    async () => {
      await prisma.block.delete({ where: { id } });
    },
    "deleted",
  );
}

// ---------------------------------------------------------------
// অর্থবছর
// ---------------------------------------------------------------

export async function saveFiscalYear(fd: FormData) {
  const id = str(fd, "id");
  const label = str(fd, "label");
  const start = str(fd, "startDate");
  const end = str(fd, "endDate");

  await run("/master/fiscal-years", async () => {
    if (!label || !start || !end) throw new ActionError("required");
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!(startDate < endDate)) throw new ActionError("dates");
    const data = { label, startDate, endDate };
    if (id) await prisma.fiscalYear.update({ where: { id }, data });
    else await prisma.fiscalYear.create({ data });
  });
}

export async function activateFiscalYear(fd: FormData) {
  const id = str(fd, "id");
  await run(
    "/master/fiscal-years",
    async () => {
      await prisma.$transaction([
        prisma.fiscalYear.updateMany({ data: { isActive: false } }),
        prisma.fiscalYear.update({ where: { id }, data: { isActive: true } }),
      ]);
    },
    "updated",
  );
}

// ---------------------------------------------------------------
// লক্ষ্যমাত্রা / বরাদ্দ
// ---------------------------------------------------------------

const SEASON_VALUES = ["RABI", "KHARIF1", "KHARIF2", "YEAR_ROUND"];

export async function saveAllocation(fd: FormData) {
  const id = str(fd, "id");
  const fiscalYearId = str(fd, "fiscalYearId");
  const demoTypeId = str(fd, "demoTypeId");
  const season = str(fd, "season");

  await run(`/master/allocations?fy=${fiscalYearId}`, async () => {
    if (!fiscalYearId || !demoTypeId || !SEASON_VALUES.includes(season)) throw new ActionError("required");
    const target = optNum(fd, "targetCount");
    if (target === null || target < 1) throw new ActionError("required");
    const demoType = await prisma.demoType.findUniqueOrThrow({ where: { id: demoTypeId } });
    const memoDate = str(fd, "memoDate");
    const data = {
      fiscalYearId,
      demoTypeId,
      fundingSourceId: demoType.fundingSourceId,
      season: season as Season,
      targetCount: Math.round(target),
      budgetPerDemo: optNum(fd, "budgetPerDemo"),
      memoNo: optStr(fd, "memoNo"),
      memoDate: memoDate ? new Date(memoDate) : null,
      remarks: optStr(fd, "remarks"),
    };
    if (id) await prisma.allocation.update({ where: { id }, data });
    else await prisma.allocation.create({ data });
  });
}

export async function deleteAllocation(fd: FormData) {
  const id = str(fd, "id");
  const fiscalYearId = str(fd, "fiscalYearId");
  await run(
    `/master/allocations?fy=${fiscalYearId}`,
    async () => {
      await prisma.allocation.delete({ where: { id } });
    },
    "deleted",
  );
}
