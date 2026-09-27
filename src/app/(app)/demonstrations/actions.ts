"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type DemoStatus, type Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { toBn } from "@/lib/format";
import { removePhotoFiles } from "@/lib/storage";

export type DemoFormState = {
  error?: string;
  values?: Record<string, string>;
  ts?: number;
};

const SEASON_VALUES = ["RABI", "KHARIF1", "KHARIF2", "YEAR_ROUND"];
const STATUS_VALUES = ["PLANNED", "ESTABLISHED", "ONGOING", "HARVESTED", "COMPLETED", "CANCELLED"];

class FormError extends Error {}

const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

function readValues(fd: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of fd.entries()) if (typeof val === "string") v[k] = val;
  return v;
}

function num(value: string | undefined, label: string, required = false): number | null {
  const raw = toAscii((value ?? "").trim()).replace(/,/g, "");
  if (!raw) {
    if (required) throw new FormError(`${label} লিখুন।`);
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new FormError(`${label}-এর ঘরে সঠিক সংখ্যা লিখুন।`);
  return n;
}

function date(value: string | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new FormError("তারিখ সঠিক নয়।");
  return d;
}

async function parse(v: Record<string, string>) {
  const t = (k: string) => (v[k] ?? "").trim();

  const required: Array<[string, string]> = [
    ["fiscalYearId", "অর্থবছর"],
    ["season", "মৌসুম"],
    ["demoTypeId", "প্রদর্শনীর ধরন"],
    ["cropId", "ফসল"],
    ["farmerName", "কৃষকের নাম"],
    ["blockId", "ব্লক"],
    ["village", "গ্রাম"],
  ];
  const missing = required.filter(([k]) => !t(k)).map(([, label]) => label);
  if (missing.length) throw new FormError(`এই ঘরগুলো পূরণ করুন: ${missing.join(", ")}।`);

  if (!SEASON_VALUES.includes(t("season"))) throw new FormError("মৌসুম সঠিক নয়।");
  const status = t("status") || "ESTABLISHED";
  if (!STATUS_VALUES.includes(status)) throw new FormError("অবস্থা সঠিক নয়।");

  const areaDecimal = num(v.areaDecimal, "আয়তন", true) as number;
  const budgetAmount = num(v.budgetAmount, "বরাদ্দ");

  const [demoType, block, variety] = await Promise.all([
    prisma.demoType.findUnique({ where: { id: t("demoTypeId") } }),
    prisma.block.findUnique({ where: { id: t("blockId") }, include: { staff: true } }),
    t("varietyId") ? prisma.variety.findUnique({ where: { id: t("varietyId") } }) : Promise.resolve(null),
  ]);
  if (!demoType) throw new FormError("প্রদর্শনীর ধরন পাওয়া যায়নি।");
  if (!block) throw new FormError("ব্লক পাওয়া যায়নি।");
  if (variety && variety.cropId !== t("cropId")) throw new FormError("জাতটি বাছাই করা ফসলের নয়।");

  const mobile = toAscii(t("mobile")).replace(/[^\d+]/g, "") || null;
  const nid = toAscii(t("nid")).replace(/\s/g, "") || null;

  return {
    demo: {
      fiscalYearId: t("fiscalYearId"),
      season: t("season") as Season,
      fundingSourceId: demoType.fundingSourceId,
      demoTypeId: demoType.id,
      cropId: t("cropId"),
      varietyId: variety?.id ?? null,
      technology: t("technology") || null,
      blockId: block.id,
      staffNameSnap: block.staff?.name ?? null,
      village: t("village"),
      landDag: t("landDag") || null,
      areaDecimal,
      budgetAmount,
      establishedDate: date(v.establishedDate),
      sowingDate: date(v.sowingDate),
      signboardPlaced: v.signboardPlaced === "on",
      status: status as DemoStatus,
      remarks: t("remarks") || null,
    },
    farmer: {
      name: t("farmerName"),
      fatherName: t("fatherName") || null,
      mobile,
      nid,
      cardNo: t("cardNo") || null,
      village: t("village"),
      blockId: block.id,
    },
  };
}

function fail(e: unknown, values: Record<string, string>): DemoFormState {
  let error = "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  if (e instanceof FormError) error = e.message;
  else if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    error = "এই এনআইডি দিয়ে অন্য একজন কৃষক আগে থেকেই আছেন।";
  else console.error(e);
  return { error, values, ts: Date.now() };
}

// ---------------------------------------------------------------
// নতুন প্রদর্শনী
// ---------------------------------------------------------------

export async function createDemonstration(_prev: DemoFormState, fd: FormData): Promise<DemoFormState> {
  const user = await requireUser();
  const values = readValues(fd);
  let id = "";

  try {
    const { demo, farmer } = await parse(values);

    // একই কৃষক আগে থাকলে (এনআইডি, নইলে মোবাইল + নাম মিলিয়ে) তাকেই ব্যবহার করা হয়
    const existing = farmer.nid
      ? await prisma.farmer.findUnique({ where: { nid: farmer.nid } })
      : farmer.mobile
        ? await prisma.farmer.findFirst({ where: { mobile: farmer.mobile, name: farmer.name } })
        : null;
    const farmerRow = existing
      ? await prisma.farmer.update({ where: { id: existing.id }, data: farmer })
      : await prisma.farmer.create({ data: farmer });

    const fy = await prisma.fiscalYear.findUniqueOrThrow({ where: { id: demo.fiscalYearId } });

    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      const max = await prisma.demonstration.aggregate({
        where: { fiscalYearId: fy.id },
        _max: { serialInYear: true },
      });
      const serial = (max._max.serialInYear ?? 0) + 1;
      try {
        created = await prisma.demonstration.create({
          data: {
            ...demo,
            farmerId: farmerRow.id,
            createdById: user.id,
            serialInYear: serial,
            regNo: `রাউ/${fy.label}/${toBn(String(serial).padStart(4, "0"))}`,
          },
          select: { id: true },
        });
      } catch (e) {
        const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (!clash || attempt === 2) throw e;
      }
    }
    if (!created) throw new FormError("রেজিস্ট্রেশন নম্বর তৈরি করা যায়নি। আবার চেষ্টা করুন।");
    id = created.id;
  } catch (e) {
    return fail(e, values);
  }

  revalidatePath("/demonstrations");
  revalidatePath("/");
  redirect(`/demonstrations/${id}?ok=created`);
}

// ---------------------------------------------------------------
// সম্পাদনা
// ---------------------------------------------------------------

export async function updateDemonstration(
  demoId: string,
  _prev: DemoFormState,
  fd: FormData,
): Promise<DemoFormState> {
  await requireUser();
  const values = readValues(fd);

  try {
    const { demo, farmer } = await parse(values);
    const current = await prisma.demonstration.findUniqueOrThrow({ where: { id: demoId } });
    if (demo.fiscalYearId !== current.fiscalYearId) {
      throw new FormError("অর্থবছর পরিবর্তন করা যায় না।");
    }

    await prisma.$transaction([
      // কৃষকের তথ্য বদলালে তার সব প্রদর্শনীতে বদলাবে, কারণ মানুষটি একই
      prisma.farmer.update({ where: { id: current.farmerId }, data: farmer }),
      prisma.demonstration.update({
        where: { id: demoId },
        data: {
          ...demo,
          // ব্লক না বদলালে স্থাপনকালীন কর্মকর্তার নাম অপরিবর্তিত থাকে
          staffNameSnap: demo.blockId === current.blockId ? current.staffNameSnap : demo.staffNameSnap,
        },
      }),
    ]);
  } catch (e) {
    return fail(e, values);
  }

  revalidatePath("/demonstrations");
  revalidatePath(`/demonstrations/${demoId}`);
  revalidatePath("/");
  redirect(`/demonstrations/${demoId}?ok=saved`);
}

// ---------------------------------------------------------------
// মুছে ফেলা (শুধু অ্যাডমিন)
// ---------------------------------------------------------------

export async function deleteDemonstration(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const photos = await prisma.photo.findMany({ where: { demonstrationId: id }, select: { storagePath: true } });
  await prisma.demonstration.delete({ where: { id } });
  await removePhotoFiles(photos.map((p) => p.storagePath));
  revalidatePath("/demonstrations");
  revalidatePath("/");
  redirect("/demonstrations?ok=deleted");
}
