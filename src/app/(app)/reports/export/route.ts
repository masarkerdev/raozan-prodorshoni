import type { Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SEASONS, seasonLabel } from "@/lib/demo";
import { REPORT_KINDS, buildReport, type ReportKind } from "@/lib/reports";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("অনুমতি নেই", { status: 401 });

  const sp = new URL(request.url).searchParams;
  const kind: ReportKind = REPORT_KINDS.some((k) => k.value === sp.get("type"))
    ? (sp.get("type") as ReportKind)
    : "funding";
  const seasonParam = sp.get("season");
  const season = SEASONS.some((s) => s.value === seasonParam) ? (seasonParam as Season) : undefined;

  const fy =
    (sp.get("fy") && (await prisma.fiscalYear.findUnique({ where: { id: sp.get("fy")! } }))) ||
    (await prisma.fiscalYear.findFirst({ where: { isActive: true } }));
  if (!fy) return new Response("অর্থবছর পাওয়া যায়নি", { status: 404 });

  const report = await buildReport(kind, fy.id, season);
  const buf = await buildWorkbook({
    sheetName: "প্রতিবেদন",
    titleLines: [
      report.title,
      "উপজেলা কৃষি অফিসারের কার্যালয়, রাউজান, চট্টগ্রাম",
      `অর্থবছর: ${fy.label} · মৌসুম: ${season ? seasonLabel(season) : "সকল"}`,
    ],
    columns: report.columns,
    rows: report.rows,
    totals: report.totals,
  });

  const kindLabel = REPORT_KINDS.find((k) => k.value === kind)!.label;
  return xlsxResponse(buf, `${kindLabel}-প্রতিবেদন-${fy.label}.xlsx`);
}
