import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildDemoWhere } from "@/lib/demo-query";
import { seasonLabel, statusInfo } from "@/lib/demo";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("অনুমতি নেই", { status: 401 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const activeFy = await prisma.fiscalYear.findFirst({ where: { isActive: true } });
  const { where } = buildDemoWhere(sp, activeFy?.id);

  const demos = await prisma.demonstration.findMany({
    where,
    orderBy: [{ fiscalYear: { startDate: "desc" } }, { serialInYear: "asc" }],
    include: {
      fiscalYear: true,
      fundingSource: true,
      demoType: true,
      crop: true,
      variety: true,
      farmer: true,
      block: { include: { union: true } },
      result: true,
      _count: { select: { fieldDays: true, inspections: true, photos: true } },
    },
  });

  const rows = demos.map((d) => {
    const c = d.result?.controlYield ? Number(d.result.controlYield) : 0;
    const inc = d.result && c > 0 ? Math.round(((Number(d.result.demoYield) - c) / c) * 1000) / 10 : null;
    return [
      d.regNo,
      d.fiscalYear.label,
      seasonLabel(d.season),
      d.fundingSource.shortName || d.fundingSource.name,
      d.demoType.name,
      d.crop.name,
      d.variety?.name ?? null,
      d.technology,
      d.farmer.name,
      d.farmer.fatherName,
      d.farmer.mobile,
      d.farmer.nid,
      d.village,
      d.block.union.name,
      d.block.name,
      d.staffNameSnap,
      Number(d.areaDecimal),
      d.budgetAmount ? Number(d.budgetAmount) : null,
      d.establishedDate,
      d.sowingDate,
      d.signboardPlaced ? "হ্যাঁ" : "না",
      statusInfo(d.status).label,
      d.result?.harvestDate ?? null,
      d.result ? Number(d.result.demoYield) : null,
      d.result?.controlYield ? Number(d.result.controlYield) : null,
      d.result?.yieldUnit ?? null,
      inc,
      d._count.inspections,
      d._count.fieldDays,
      d._count.photos,
      d.remarks,
    ];
  });

  const buf = await buildWorkbook({
    sheetName: "প্রদর্শনী রেজিস্টার",
    titleLines: ["প্রদর্শনী রেজিস্টার", "উপজেলা কৃষি অফিসারের কার্যালয়, রাউজান, চট্টগ্রাম"],
    columns: [
      { label: "রেজি. নং", width: 20 },
      { label: "অর্থবছর", width: 10 },
      { label: "মৌসুম", width: 10 },
      { label: "খাত", width: 18 },
      { label: "প্রদর্শনীর ধরন", width: 28 },
      { label: "ফসল", width: 14 },
      { label: "জাত", width: 16 },
      { label: "প্রযুক্তি", width: 20 },
      { label: "কৃষকের নাম", width: 20 },
      { label: "পিতা/স্বামী", width: 20 },
      { label: "মোবাইল", width: 14 },
      { label: "এনআইডি", width: 18 },
      { label: "গ্রাম", width: 14 },
      { label: "ইউনিয়ন", width: 14 },
      { label: "ব্লক", width: 14 },
      { label: "উপসহকারী কৃষি কর্মকর্তা", width: 20 },
      { label: "আয়তন (শতাংশ)", width: 12 },
      { label: "বরাদ্দ (টাকা)", width: 12 },
      { label: "স্থাপনের তারিখ", width: 13 },
      { label: "বপন/রোপণ", width: 13 },
      { label: "সাইনবোর্ড", width: 10 },
      { label: "অবস্থা", width: 13 },
      { label: "কর্তনের তারিখ", width: 13 },
      { label: "প্রদর্শনী ফলন", width: 12 },
      { label: "কন্ট্রোল ফলন", width: 12 },
      { label: "ফলনের একক", width: 12 },
      { label: "ফলন বৃদ্ধি (%)", width: 12 },
      { label: "পরিদর্শন", width: 10 },
      { label: "মাঠ দিবস", width: 10 },
      { label: "ছবি", width: 8 },
      { label: "মন্তব্য", width: 24 },
    ],
    rows,
  });

  return xlsxResponse(buf, `প্রদর্শনী-রেজিস্টার.xlsx`);
}
