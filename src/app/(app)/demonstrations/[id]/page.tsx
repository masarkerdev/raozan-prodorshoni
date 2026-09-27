import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDateBn, toBn } from "@/lib/format";
import { seasonLabel } from "@/lib/demo";
import { Flash } from "@/components/Flash";
import { StatusPill } from "@/components/StatusPill";
import { Card, secondaryBtnCls } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { signedPhotoUrls } from "@/lib/storage";
import { deleteDemonstration } from "../actions";
import { FieldDaySection, InputsSection, InspectionsSection, PhotosSection, ResultSection } from "./sections";

export const dynamic = "force-dynamic";

function KV({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function DemonstrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { ok, err } = await searchParams;

  const demo = await prisma.demonstration.findUnique({
    where: { id },
    include: {
      fiscalYear: true,
      fundingSource: true,
      demoType: true,
      crop: true,
      variety: true,
      farmer: { include: { demonstrations: { select: { id: true, regNo: true }, orderBy: { createdAt: "desc" } } } },
      block: { include: { union: true } },
      createdBy: true,
      inputs: { orderBy: { distributedOn: "asc" } },
      inspections: { orderBy: { inspectedOn: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
      result: true,
      fieldDays: { orderBy: { heldOn: "desc" } },
    },
  });
  if (!demo) notFound();

  const otherDemos = demo.farmer.demonstrations.filter((d) => d.id !== demo.id);
  const photoUrls = await signedPhotoUrls(demo.photos.map((p) => p.storagePath));

  return (
    <>
      <Flash ok={ok} err={err} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/demonstrations" className="text-sm font-semibold text-brand print:hidden">
            ← রেজিস্টারে ফিরুন
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl">{demo.regNo}</h1>
            <StatusPill status={demo.status} />
          </div>
          <p className="mt-1 text-muted">
            {demo.demoType.name} · {demo.fundingSource.shortName || demo.fundingSource.name} ·{" "}
            {seasonLabel(demo.season)} {demo.fiscalYear.label}
          </p>
        </div>
        <div className="flex gap-3 print:hidden">
          <PrintButton />
          <Link
            href={`/demonstrations/${demo.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
          >
            সম্পাদনা
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2 print:block print:space-y-4">
        <div className="flex flex-col gap-5">
        <Card title="প্রদর্শনীর তথ্য">
          <KV
            items={[
              ["ফসল ও জাত", demo.variety ? `${demo.crop.name} · ${demo.variety.name}` : demo.crop.name],
              ["প্রদর্শিত প্রযুক্তি", demo.technology],
              ["আয়তন", `${toBn(demo.areaDecimal.toString())} শতাংশ`],
              ["বরাদ্দ", demo.budgetAmount ? `৳ ${toBn(demo.budgetAmount.toString())}` : null],
              ["স্থাপনের তারিখ", demo.establishedDate ? formatDateBn(demo.establishedDate) : null],
              ["বপন / রোপণ", demo.sowingDate ? formatDateBn(demo.sowingDate) : null],
              ["সাইনবোর্ড", demo.signboardPlaced ? "স্থাপিত" : "স্থাপিত হয়নি"],
              ["এন্ট্রি করেছেন", demo.createdBy.name],
            ]}
          />
          {demo.remarks && <p className="mt-4 border-t border-line pt-3">মন্তব্য: {demo.remarks}</p>}
        </Card>

        <Card title="কৃষক ও অবস্থান">
          <KV
            items={[
              ["কৃষকের নাম", demo.farmer.name],
              ["পিতা / স্বামীর নাম", demo.farmer.fatherName],
              ["মোবাইল", demo.farmer.mobile ? toBn(demo.farmer.mobile) : null],
              ["এনআইডি / কৃষি কার্ড", [demo.farmer.nid, demo.farmer.cardNo].filter(Boolean).join(" / ")],
              ["গ্রাম", demo.village],
              ["ইউনিয়ন / ব্লক", `${demo.block.union.name} / ${demo.block.name}`],
              ["দাগ / মৌজা", demo.landDag],
              ["উপসহকারী কৃষি কর্মকর্তা", demo.staffNameSnap],
            ]}
          />
          {otherDemos.length > 0 && (
            <p className="mt-4 border-t border-line pt-3 text-sm">
              এই কৃষকের অন্যান্য প্রদর্শনী:{" "}
              {otherDemos.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link href={`/demonstrations/${d.id}`} className="font-semibold text-brand">
                    {d.regNo}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </Card>

        <InputsSection demoId={demo.id} items={demo.inputs} />
        </div>

        <div className="flex flex-col gap-5">
          <ResultSection demoId={demo.id} result={demo.result} />
          <InspectionsSection
            demoId={demo.id}
            items={demo.inspections}
            userName={user.name}
            userDesignation={user.designation ?? ""}
          />
          <PhotosSection demoId={demo.id} photos={demo.photos} urls={photoUrls} />
          <FieldDaySection demoId={demo.id} items={demo.fieldDays} />
        </div>
      </div>

      {user.role === "ADMIN" && (
        <details className="mt-8 max-w-xl rounded-xl border border-line bg-white p-4 print:hidden">
          <summary className="cursor-pointer font-semibold text-[#8a2d1f]">প্রদর্শনীটি মুছে ফেলুন</summary>
          <p className="mt-3 text-sm">
            এই প্রদর্শনী ও এর সব পরিদর্শন, ছবি ও ফলাফল স্থায়ীভাবে মুছে যাবে। শুধু ভুল এন্ট্রির ক্ষেত্রে মুছুন; বাস্তবায়িত না হলে
            অবস্থা “বাতিল” করে রাখাই ভালো।
          </p>
          <form action={deleteDemonstration} className="mt-3">
            <input type="hidden" name="id" value={demo.id} />
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-[#8a2d1f] px-5 font-semibold text-white hover:bg-[#6f2418]"
            >
              হ্যাঁ, স্থায়ীভাবে মুছুন
            </button>
          </form>
        </details>
      )}
      <div className="mt-4 print:hidden">
        <Link href="/demonstrations" className={secondaryBtnCls}>
          তালিকায় ফিরুন
        </Link>
      </div>
    </>
  );
}
