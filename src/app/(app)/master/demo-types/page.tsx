import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, EmptyRow, Field, StatusBadge, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { saveDemoType, toggleDemoType } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

export default async function DemoTypesPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit } = await searchParams;

  const [types, sources] = await Promise.all([
    prisma.demoType.findMany({
      orderBy: [{ fundingSource: { name: "asc" } }, { name: "asc" }],
      include: { fundingSource: true },
    }),
    prisma.fundingSource.findMany({ where: { isActive: true }, orderBy: [{ type: "desc" }, { name: "asc" }] }),
  ]);
  const editing = edit ? types.find((t) => t.id === edit) : undefined;

  if (sources.length === 0 && !editing) {
    return (
      <Card title="প্রদর্শনীর ধরন">
        <p className="text-muted">
          প্রদর্শনীর ধরন যোগ করার আগে অন্তত একটি সক্রিয় খাত লাগবে।{" "}
          <Link href="/master/funding" className="font-semibold text-brand">
            খাত যোগ করুন
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "প্রদর্শনীর ধরন সম্পাদনা" : "নতুন প্রদর্শনীর ধরন"}>
          <form key={editing?.id ?? "new"} action={saveDemoType} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="খাত *">
              <select name="fundingSourceId" required defaultValue={editing?.fundingSourceId ?? ""} className={inputCls}>
                <option value="" disabled>
                  খাত বেছে নিন
                </option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName || s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="প্রদর্শনীর নাম *" hint="যেমন: উফশী বোরো ধান প্রদর্শনী">
              <input name="name" required defaultValue={editing?.name} className={inputCls} />
            </Field>
            <Field label="প্রতি প্রদর্শনীর আয়তন (শতাংশ)" hint="নতুন এন্ট্রিতে আপনাআপনি বসবে">
              <input
                name="defaultAreaDec"
                inputMode="decimal"
                defaultValue={editing?.defaultAreaDec?.toString() ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="প্রতি প্রদর্শনীর বরাদ্দ (টাকা)">
              <input
                name="defaultBudget"
                inputMode="decimal"
                defaultValue={editing?.defaultBudget?.toString() ?? ""}
                className={inputCls}
              />
            </Field>
            <div className="flex gap-3">
              <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "যোগ করুন"}</SubmitButton>
              {editing && <CancelLink href="/master/demo-types" />}
            </div>
          </form>
        </Card>

        <Card title="প্রদর্শনীর ধরনের তালিকা">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>প্রদর্শনী</th>
                  <th className={thCls}>খাত</th>
                  <th className={thCls}>আয়তন</th>
                  <th className={thCls}>বরাদ্দ</th>
                  <th className={thCls}>অবস্থা</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 && <EmptyRow colSpan={6}>এখনো কোনো প্রদর্শনীর ধরন যোগ করা হয়নি।</EmptyRow>}
                {types.map((t) => (
                  <tr key={t.id}>
                    <td className={`${tdCls} font-semibold`}>{t.name}</td>
                    <td className={tdCls}>{t.fundingSource.shortName || t.fundingSource.name}</td>
                    <td className={tdCls}>{t.defaultAreaDec ? `${toBn(t.defaultAreaDec.toString())} শতাংশ` : "—"}</td>
                    <td className={tdCls}>{t.defaultBudget ? `৳ ${toBn(t.defaultBudget.toString())}` : "—"}</td>
                    <td className={tdCls}>
                      <StatusBadge active={t.isActive} />
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <Link href={`/master/demo-types?edit=${t.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        <form action={toggleDemoType}>
                          <input type="hidden" name="id" value={t.id} />
                          <button type="submit" className={smallBtnCls}>
                            {t.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
