import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, EmptyRow, Field, StatusBadge, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { saveFundingSource, toggleFundingSource } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

export default async function FundingPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit } = await searchParams;

  const sources = await prisma.fundingSource.findMany({
    orderBy: [{ type: "desc" }, { name: "asc" }],
    include: { _count: { select: { demoTypes: true, demonstrations: true } } },
  });
  const editing = edit ? sources.find((s) => s.id === edit) : undefined;

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "খাত সম্পাদনা" : "নতুন খাত যোগ"}>
          <form key={editing?.id ?? "new"} action={saveFundingSource} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="খাতের ধরন *">
              <select name="type" defaultValue={editing?.type ?? "PROJECT"} className={inputCls}>
                <option value="PROJECT">উন্নয়ন প্রকল্প</option>
                <option value="REVENUE">রাজস্ব খাত</option>
              </select>
            </Field>
            <Field label="পূর্ণ নাম *">
              <input name="name" required defaultValue={editing?.name} className={inputCls} />
            </Field>
            <Field label="সংক্ষিপ্ত নাম" hint="তালিকা ও রিপোর্টে এই নাম দেখাবে">
              <input name="shortName" defaultValue={editing?.shortName ?? ""} className={inputCls} />
            </Field>
            <div className="flex gap-3">
              <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "খাত যোগ করুন"}</SubmitButton>
              {editing && <CancelLink href="/master/funding" />}
            </div>
          </form>
        </Card>

        <Card title="খাতের তালিকা">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>নাম</th>
                  <th className={thCls}>ধরন</th>
                  <th className={thCls}>প্রদর্শনীর ধরন</th>
                  <th className={thCls}>অবস্থা</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 && <EmptyRow colSpan={5}>এখনো কোনো খাত যোগ করা হয়নি।</EmptyRow>}
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td className={tdCls}>
                      <div className="font-semibold">{s.name}</div>
                      {s.shortName && <div className="text-sm text-muted">{s.shortName}</div>}
                    </td>
                    <td className={tdCls}>{s.type === "REVENUE" ? "রাজস্ব" : "প্রকল্প"}</td>
                    <td className={tdCls}>{toBn(s._count.demoTypes)}টি</td>
                    <td className={tdCls}>
                      <StatusBadge active={s.isActive} />
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-2">
                        <Link href={`/master/funding?edit=${s.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        <form action={toggleFundingSource}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className={smallBtnCls}>
                            {s.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            পুরনো প্রকল্প মুছে না ফেলে নিষ্ক্রিয় করুন। এতে আগের প্রদর্শনীর রেকর্ড ঠিক থাকবে, কিন্তু নতুন এন্ট্রিতে দেখাবে না।
          </p>
        </Card>
      </div>
    </>
  );
}
