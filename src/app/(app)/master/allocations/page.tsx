import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toBn, formatDateBn } from "@/lib/format";
import { SEASONS, seasonLabel } from "@/lib/demo";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, EmptyRow, Field, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { deleteAllocation, saveAllocation } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string; fy?: string }>;

export default async function AllocationsPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit, fy: fyParam } = await searchParams;

  const [fiscalYears, demoTypes] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.demoType.findMany({
      where: { isActive: true },
      include: { fundingSource: true },
      orderBy: [{ fundingSource: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const fy = fiscalYears.find((f) => f.id === fyParam) ?? fiscalYears.find((f) => f.isActive) ?? fiscalYears[0];
  if (!fy) {
    return <p className="text-muted">আগে অর্থবছর যোগ করুন।</p>;
  }

  const [allocations, achieved] = await Promise.all([
    prisma.allocation.findMany({
      where: { fiscalYearId: fy.id },
      include: { demoType: true, fundingSource: true },
      orderBy: [{ fundingSource: { name: "asc" } }, { demoType: { name: "asc" } }, { season: "asc" }],
    }),
    // বাতিল ছাড়া স্থাপিত প্রদর্শনী — ধরন ও মৌসুম অনুযায়ী
    prisma.demonstration.groupBy({
      by: ["demoTypeId", "season"],
      where: { fiscalYearId: fy.id, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
  ]);

  const doneOf = (demoTypeId: string, season: string) =>
    achieved.find((a) => a.demoTypeId === demoTypeId && a.season === season)?._count._all ?? 0;

  const editing = edit ? allocations.find((a) => a.id === edit) : undefined;
  const totalTarget = allocations.reduce((s, a) => s + a.targetCount, 0);
  const totalDone = allocations.reduce((s, a) => s + doneOf(a.demoTypeId, a.season), 0);

  // খাত অনুযায়ী প্রদর্শনীর ধরন গ্রুপ
  const groups = new Map<string, typeof demoTypes>();
  for (const d of demoTypes) {
    const k = d.fundingSource.shortName || d.fundingSource.name;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">অর্থবছর:</span>
        {fiscalYears.map((f) => (
          <Link
            key={f.id}
            href={`/master/allocations?fy=${f.id}`}
            aria-current={f.id === fy.id ? "true" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${
              f.id === fy.id ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-paper"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "লক্ষ্যমাত্রা সম্পাদনা" : `নতুন লক্ষ্যমাত্রা (${fy.label})`}>
          {demoTypes.length === 0 ? (
            <p className="text-muted">
              আগে{" "}
              <Link href="/master/demo-types" className="font-semibold text-brand">
                প্রদর্শনীর ধরন
              </Link>{" "}
              যোগ করুন।
            </p>
          ) : (
            <form key={editing?.id ?? `new-${fy.id}`} action={saveAllocation} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <input type="hidden" name="fiscalYearId" value={fy.id} />
              <Field label="প্রদর্শনীর ধরন *">
                <select name="demoTypeId" required defaultValue={editing?.demoTypeId ?? ""} className={inputCls}>
                  <option value="" disabled>
                    বেছে নিন
                  </option>
                  {[...groups.entries()].map(([funding, items]) => (
                    <optgroup key={funding} label={funding}>
                      {items.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="মৌসুম *">
                <select name="season" required defaultValue={editing?.season ?? ""} className={inputCls}>
                  <option value="" disabled>
                    বেছে নিন
                  </option>
                  {SEASONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="লক্ষ্যমাত্রা (সংখ্যা) *">
                <input
                  name="targetCount"
                  required
                  inputMode="numeric"
                  defaultValue={editing?.targetCount ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="প্রতি প্রদর্শনীর বরাদ্দ (টাকা)">
                <input
                  name="budgetPerDemo"
                  inputMode="decimal"
                  defaultValue={editing?.budgetPerDemo?.toString() ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="বরাদ্দপত্রের স্মারক নং">
                <input name="memoNo" defaultValue={editing?.memoNo ?? ""} className={inputCls} />
              </Field>
              <Field label="স্মারকের তারিখ">
                <input
                  name="memoDate"
                  type="date"
                  defaultValue={editing?.memoDate ? editing.memoDate.toISOString().slice(0, 10) : ""}
                  className={inputCls}
                />
              </Field>
              <Field label="মন্তব্য">
                <input name="remarks" defaultValue={editing?.remarks ?? ""} className={inputCls} />
              </Field>
              <div className="flex gap-3">
                <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "যোগ করুন"}</SubmitButton>
                {editing && <CancelLink href={`/master/allocations?fy=${fy.id}`} />}
              </div>
            </form>
          )}
        </Card>

        <Card
          title={`${fy.label} অর্থবছরের লক্ষ্যমাত্রা`}
          actions={
            <span className="text-sm text-muted">
              অর্জন {toBn(totalDone)} / {toBn(totalTarget)}
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>প্রদর্শনী</th>
                  <th className={thCls}>খাত</th>
                  <th className={thCls}>মৌসুম</th>
                  <th className={thCls}>লক্ষ্য</th>
                  <th className={thCls}>স্থাপিত</th>
                  <th className={thCls}>স্মারক</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 && (
                  <EmptyRow colSpan={7}>এই অর্থবছরের কোনো লক্ষ্যমাত্রা যোগ করা হয়নি।</EmptyRow>
                )}
                {allocations.map((a) => {
                  const done = doneOf(a.demoTypeId, a.season);
                  return (
                    <tr key={a.id}>
                      <td className={`${tdCls} font-semibold`}>{a.demoType.name}</td>
                      <td className={tdCls}>{a.fundingSource.shortName || a.fundingSource.name}</td>
                      <td className={tdCls}>{seasonLabel(a.season)}</td>
                      <td className={tdCls}>{toBn(a.targetCount)}</td>
                      <td className={tdCls}>
                        <span className={done >= a.targetCount ? "font-semibold text-brand" : ""}>{toBn(done)}</span>
                      </td>
                      <td className={`${tdCls} text-sm`}>
                        {a.memoNo ?? "—"}
                        {a.memoDate && <div className="text-muted">{formatDateBn(a.memoDate)}</div>}
                      </td>
                      <td className={tdCls}>
                        <div className="flex justify-end gap-2">
                          <Link href={`/master/allocations?fy=${fy.id}&edit=${a.id}`} className={smallBtnCls}>
                            সম্পাদনা
                          </Link>
                          <form action={deleteAllocation}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="fiscalYearId" value={fy.id} />
                            <button type="submit" className={smallBtnCls}>
                              মুছুন
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            একই প্রদর্শনীর একাধিক মৌসুমে বরাদ্দ থাকলে প্রতিটি মৌসুম আলাদা লাইনে দিন।
          </p>
        </Card>
      </div>
    </>
  );
}
