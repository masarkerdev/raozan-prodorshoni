import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DemoForm } from "../../DemoForm";
import { loadDemoFormOptions } from "../../options";
import { updateDemonstration } from "../../actions";

export const dynamic = "force-dynamic";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditDemonstrationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const demo = await prisma.demonstration.findUnique({
    where: { id },
    include: { farmer: true, block: true },
  });
  if (!demo) notFound();

  const options = await loadDemoFormOptions(demo.demoTypeId);

  const initial: Record<string, string> = {
    fiscalYearId: demo.fiscalYearId,
    season: demo.season,
    demoTypeId: demo.demoTypeId,
    cropId: demo.cropId,
    varietyId: demo.varietyId ?? "",
    technology: demo.technology ?? "",
    farmerName: demo.farmer.name,
    fatherName: demo.farmer.fatherName ?? "",
    mobile: demo.farmer.mobile ?? "",
    nid: demo.farmer.nid ?? "",
    cardNo: demo.farmer.cardNo ?? "",
    unionId: demo.block.unionId,
    blockId: demo.blockId,
    village: demo.village,
    landDag: demo.landDag ?? "",
    areaDecimal: demo.areaDecimal.toString(),
    budgetAmount: demo.budgetAmount?.toString() ?? "",
    establishedDate: iso(demo.establishedDate),
    sowingDate: iso(demo.sowingDate),
    status: demo.status,
    signboardPlaced: demo.signboardPlaced ? "on" : "",
    remarks: demo.remarks ?? "",
  };

  return (
    <>
      <PageHeader title="প্রদর্শনী সম্পাদনা" subtitle={demo.regNo} />
      <DemoForm
        action={updateDemonstration.bind(null, demo.id)}
        options={options}
        initial={initial}
        submitLabel="পরিবর্তন সংরক্ষণ"
        cancelHref={`/demonstrations/${demo.id}`}
        lockFiscalYear
      />
    </>
  );
}
