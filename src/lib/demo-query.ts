import type { DemoStatus, Prisma, Season } from "@prisma/client";
import { toBn } from "@/lib/format";
import { toAscii } from "@/lib/form";

export type RegisterFilters = {
  fy?: string;
  season?: string;
  fund?: string;
  union?: string;
  status?: string;
  q?: string;
};

/** রেজিস্টার তালিকা ও এক্সেল — দুই জায়গাতেই একই ফিল্টার */
export function buildDemoWhere(f: RegisterFilters, activeFyId?: string) {
  const fy = f.fy ?? activeFyId ?? "all";
  const q = (f.q ?? "").trim();
  const where: Prisma.DemonstrationWhereInput = {
    ...(fy !== "all" && { fiscalYearId: fy }),
    ...(f.season && { season: f.season as Season }),
    ...(f.fund && { fundingSourceId: f.fund }),
    ...(f.status && { status: f.status as DemoStatus }),
    ...(f.union && { block: { unionId: f.union } }),
    ...(q && {
      OR: [
        { regNo: { contains: toBn(toAscii(q)) } },
        { farmer: { name: { contains: q, mode: "insensitive" } } },
        { farmer: { mobile: { contains: toAscii(q) } } },
        { village: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  return { where, fy, q };
}
