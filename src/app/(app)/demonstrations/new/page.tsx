import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DemoForm } from "../DemoForm";
import { loadDemoFormOptions } from "../options";
import { createDemonstration } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDemonstrationPage() {
  await requireUser();
  const [options, activeFy] = await Promise.all([
    loadDemoFormOptions(),
    prisma.fiscalYear.findFirst({ where: { isActive: true } }),
  ]);

  const blockCount = options.unions.reduce((n, u) => n + u.blocks.length, 0);
  const missing = [
    options.demoTypes.length === 0 && "প্রদর্শনীর ধরন",
    blockCount === 0 && "ব্লক",
    options.fiscalYears.length === 0 && "অর্থবছর",
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="নতুন প্রদর্শনী" subtitle="রেজিস্ট্রেশন নম্বর সংরক্ষণের সময় আপনাআপনি তৈরি হবে" />
      {missing.length > 0 ? (
        <div className="rounded-xl border border-line bg-white p-6">
          <p>প্রদর্শনী যোগ করার আগে মাস্টার ডেটায় এগুলো যোগ করুন: {missing.join(", ")}।</p>
          <Link href="/master" className="mt-3 inline-block font-semibold text-brand">
            মাস্টার ডেটায় যান
          </Link>
        </div>
      ) : (
        <DemoForm
          action={createDemonstration}
          options={options}
          initial={{ fiscalYearId: activeFy?.id ?? "", status: "ESTABLISHED" }}
          submitLabel="প্রদর্শনী সংরক্ষণ করুন"
          cancelHref="/demonstrations"
        />
      )}
    </>
  );
}
