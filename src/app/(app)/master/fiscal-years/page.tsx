import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, EmptyRow, Field, StatusBadge, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { activateFiscalYear, saveFiscalYear } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export default async function FiscalYearsPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit } = await searchParams;

  const years = await prisma.fiscalYear.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { demonstrations: true } } },
  });
  const editing = edit ? years.find((y) => y.id === edit) : undefined;

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "অর্থবছর সম্পাদনা" : "নতুন অর্থবছর যোগ"}>
          <form key={editing?.id ?? "new"} action={saveFiscalYear} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="অর্থবছর *" hint="যেমন: ২০২৭-২৮">
              <input name="label" required defaultValue={editing?.label} className={inputCls} />
            </Field>
            <Field label="শুরুর তারিখ *">
              <input
                name="startDate"
                type="date"
                required
                defaultValue={editing ? isoDate(editing.startDate) : ""}
                className={inputCls}
              />
            </Field>
            <Field label="শেষের তারিখ *">
              <input
                name="endDate"
                type="date"
                required
                defaultValue={editing ? isoDate(editing.endDate) : ""}
                className={inputCls}
              />
            </Field>
            <div className="flex gap-3">
              <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "যোগ করুন"}</SubmitButton>
              {editing && <CancelLink href="/master/fiscal-years" />}
            </div>
          </form>
        </Card>

        <Card title="অর্থবছরের তালিকা">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>অর্থবছর</th>
                  <th className={thCls}>মেয়াদ</th>
                  <th className={thCls}>অবস্থা</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {years.length === 0 && <EmptyRow colSpan={4}>কোনো অর্থবছর নেই।</EmptyRow>}
                {years.map((y) => (
                  <tr key={y.id}>
                    <td className={`${tdCls} font-semibold`}>{y.label}</td>
                    <td className={`${tdCls} text-sm`}>
                      {formatDateBn(y.startDate)} — {formatDateBn(y.endDate)}
                    </td>
                    <td className={tdCls}>
                      {y.isActive ? <StatusBadge active /> : <span className="text-sm text-muted">—</span>}
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <Link href={`/master/fiscal-years?edit=${y.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        {!y.isActive && (
                          <form action={activateFiscalYear}>
                            <input type="hidden" name="id" value={y.id} />
                            <button type="submit" className={smallBtnCls}>
                              চলতি হিসেবে নির্ধারণ
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            চলতি অর্থবছর ড্যাশবোর্ডে দেখায় এবং নতুন প্রদর্শনী এন্ট্রিতে আপনাআপনি বেছে নেওয়া থাকে।
          </p>
        </Card>
      </div>
    </>
  );
}
