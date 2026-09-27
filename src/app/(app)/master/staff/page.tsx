import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, EmptyRow, Field, StatusBadge, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { saveStaff, toggleStaff } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

export default async function StaffPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit } = await searchParams;

  const staff = await prisma.staff.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { blocks: { include: { union: true }, orderBy: { name: "asc" } } },
  });
  const editing = edit ? staff.find((s) => s.id === edit) : undefined;

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "কর্মকর্তার তথ্য সম্পাদনা" : "নতুন কর্মকর্তা যোগ"}>
          <form key={editing?.id ?? "new"} action={saveStaff} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="নাম *">
              <input name="name" required defaultValue={editing?.name} className={inputCls} />
            </Field>
            <Field label="পদবি">
              <input
                name="designation"
                defaultValue={editing?.designation ?? "উপসহকারী কৃষি কর্মকর্তা"}
                className={inputCls}
              />
            </Field>
            <Field label="মোবাইল">
              <input name="mobile" type="tel" inputMode="tel" defaultValue={editing?.mobile ?? ""} className={inputCls} />
            </Field>
            <div className="flex gap-3">
              <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "যোগ করুন"}</SubmitButton>
              {editing && <CancelLink href="/master/staff" />}
            </div>
          </form>
        </Card>

        <Card title="কর্মকর্তাদের তালিকা">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>নাম ও পদবি</th>
                  <th className={thCls}>মোবাইল</th>
                  <th className={thCls}>দায়িত্বপ্রাপ্ত ব্লক</th>
                  <th className={thCls}>অবস্থা</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 && <EmptyRow colSpan={5}>এখনো কোনো কর্মকর্তা যোগ করা হয়নি।</EmptyRow>}
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className={tdCls}>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-sm text-muted">{s.designation}</div>
                    </td>
                    <td className={tdCls}>{s.mobile ?? "—"}</td>
                    <td className={`${tdCls} text-sm`}>
                      {s.blocks.length === 0 ? "—" : s.blocks.map((b) => `${b.union.name}: ${b.name}`).join(", ")}
                    </td>
                    <td className={tdCls}>
                      <StatusBadge active={s.isActive} />
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <Link href={`/master/staff?edit=${s.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        <form action={toggleStaff}>
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
            কেউ বদলি হলে নিষ্ক্রিয় করুন এবং ব্লক ট্যাব থেকে ব্লকগুলো নতুন কর্মকর্তাকে দিন।
          </p>
        </Card>
      </div>
    </>
  );
}
