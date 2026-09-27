"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PhotoStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ActionError, mapError, optDate, optNum, optStr, reqDate, reqNum, str } from "@/lib/form";
import { removePhotoFiles, uploadPhotoFile } from "@/lib/storage";
import { PHOTO_STAGES } from "@/lib/demo";

/** কাজ শেষে বিবরণ পেজের নির্দিষ্ট অংশে ফেরত পাঠায় */
async function back(demoId: string, anchor: string, fn: () => Promise<unknown>, okCode = "saved") {
  await requireUser();
  let err: string | null = null;
  try {
    await fn();
  } catch (e) {
    err = mapError(e);
  }
  const base = `/demonstrations/${demoId}`;
  if (err) redirect(`${base}?err=${err}#${anchor}`);
  revalidatePath(base);
  redirect(`${base}?ok=${okCode}#${anchor}`);
}

// ---------------------------------------------------------------
// উপকরণ বিতরণ
// ---------------------------------------------------------------

export async function addInput(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(demonstrationId, "inputs", async () => {
    const itemName = str(fd, "itemName");
    const unit = str(fd, "unit");
    if (!itemName || !unit) throw new ActionError("required");
    await prisma.inputDistribution.create({
      data: {
        demonstrationId,
        itemName,
        unit,
        quantity: reqNum(fd, "quantity"),
        distributedOn: optDate(fd, "distributedOn"),
        remarks: optStr(fd, "remarks"),
      },
    });
  });
}

export async function deleteInput(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(
    demonstrationId,
    "inputs",
    () => prisma.inputDistribution.deleteMany({ where: { id: str(fd, "id"), demonstrationId } }),
    "deleted",
  );
}

// ---------------------------------------------------------------
// পরিদর্শন
// ---------------------------------------------------------------

export async function addInspection(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(demonstrationId, "inspections", async () => {
    const inspectorName = str(fd, "inspectorName");
    if (!inspectorName) throw new ActionError("required");
    await prisma.inspection.create({
      data: {
        demonstrationId,
        inspectedOn: reqDate(fd, "inspectedOn"),
        inspectorName,
        designation: optStr(fd, "designation"),
        cropStage: optStr(fd, "cropStage"),
        condition: optStr(fd, "condition"),
        comment: optStr(fd, "comment"),
      },
    });
  });
}

export async function deleteInspection(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(
    demonstrationId,
    "inspections",
    () => prisma.inspection.deleteMany({ where: { id: str(fd, "id"), demonstrationId } }),
    "deleted",
  );
}

// ---------------------------------------------------------------
// ছবি — ব্রাউজার থেকে সরাসরি ডাকা হয়, তাই redirect না করে ফলাফল ফেরত দেয়
// ---------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPhoto(fd: FormData): Promise<{ error?: string }> {
  await requireUser();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "ছবি রাখার সেটআপ সম্পূর্ণ হয়নি: .env ফাইলে SUPABASE_SERVICE_ROLE_KEY দেওয়া নেই।" };
  }
  const demonstrationId = str(fd, "demonstrationId");
  const file = fd.get("file");
  const stage = str(fd, "stage") || "OTHER";

  if (!(file instanceof Blob) || file.size === 0) return { error: "ছবি বেছে নিন।" };
  if (!ALLOWED.includes(file.type)) return { error: "শুধু JPG, PNG বা WEBP ছবি দেওয়া যাবে।" };
  if (file.size > MAX_BYTES) return { error: "ছবির আকার ৫ MB-এর বেশি।" };
  if (!PHOTO_STAGES.some((s) => s.value === stage)) return { error: "পর্যায় সঠিক নয়।" };

  const demo = await prisma.demonstration.findUnique({ where: { id: demonstrationId }, select: { id: true } });
  if (!demo) return { error: "প্রদর্শনী পাওয়া যায়নি।" };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${demonstrationId}/${randomUUID()}.${ext}`;

  try {
    await uploadPhotoFile(path, file, file.type);
    await prisma.photo.create({
      data: {
        demonstrationId,
        storagePath: path,
        stage: stage as PhotoStage,
        caption: optStr(fd, "caption"),
        takenOn: optDate(fd, "takenOn"),
      },
    });
  } catch (e) {
    console.error(e);
    await removePhotoFiles([path]);
    return { error: "ছবি সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" };
  }

  revalidatePath(`/demonstrations/${demonstrationId}`);
  return {};
}

export async function deletePhoto(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(
    demonstrationId,
    "photos",
    async () => {
      const photo = await prisma.photo.findFirst({ where: { id: str(fd, "id"), demonstrationId } });
      if (!photo) return;
      await prisma.photo.delete({ where: { id: photo.id } });
      await removePhotoFiles([photo.storagePath]);
    },
    "deleted",
  );
}

// ---------------------------------------------------------------
// কর্তন ও ফলাফল
// ---------------------------------------------------------------

export async function saveResult(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(
    demonstrationId,
    "result",
    async () => {
      const data = {
        harvestDate: reqDate(fd, "harvestDate"),
        demoYield: reqNum(fd, "demoYield"),
        controlYield: optNum(fd, "controlYield"),
        yieldUnit: str(fd, "yieldUnit") || "টন/হেক্টর",
        productionCost: optNum(fd, "productionCost"),
        grossReturn: optNum(fd, "grossReturn"),
        farmerOpinion: optStr(fd, "farmerOpinion"),
        officerComment: optStr(fd, "officerComment"),
      };
      await prisma.$transaction(async (tx) => {
        await tx.harvestResult.upsert({
          where: { demonstrationId },
          update: data,
          create: { demonstrationId, ...data },
        });
        // ফলাফল দিলে অবস্থা আপনাআপনি "কর্তন সম্পন্ন" হয় (যদি আগের কোনো ধাপে থাকে)
        await tx.demonstration.updateMany({
          where: { id: demonstrationId, status: { in: ["PLANNED", "ESTABLISHED", "ONGOING"] } },
          data: { status: "HARVESTED" },
        });
      });
    },
    "result",
  );
}

// ---------------------------------------------------------------
// মাঠ দিবস
// ---------------------------------------------------------------

export async function addFieldDay(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(demonstrationId, "fieldday", async () => {
    await prisma.fieldDay.create({
      data: {
        demonstrationId,
        heldOn: reqDate(fd, "heldOn"),
        maleParticipants: Math.round(optNum(fd, "maleParticipants") ?? 0),
        femaleParticipants: Math.round(optNum(fd, "femaleParticipants") ?? 0),
        chiefGuest: optStr(fd, "chiefGuest"),
        chairperson: optStr(fd, "chairperson"),
        remarks: optStr(fd, "remarks"),
      },
    });
  });
}

export async function deleteFieldDay(fd: FormData) {
  const demonstrationId = str(fd, "demonstrationId");
  await back(
    demonstrationId,
    "fieldday",
    () => prisma.fieldDay.deleteMany({ where: { id: str(fd, "id"), demonstrationId } }),
    "deleted",
  );
}
