import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, Field, inputCls, smallBtnCls } from "@/components/ui";
import { deleteBlock, saveBlock } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

export default async function BlocksPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit } = await searchParams;

  const [unions, staff] = await Promise.all([
    prisma.union.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        blocks: {
          orderBy: { name: "asc" },
          include: { staff: true, _count: { select: { demonstrations: true, farmers: true } } },
        },
      },
    }),
    prisma.staff.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const allBlocks = unions.flatMap((u) => u.blocks);
  const editing = edit ? allBlocks.find((b) => b.id === edit) : undefined;

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card title={editing ? "ব্লক সম্পাদনা" : "নতুন ব্লক যোগ"}>
          <form key={editing?.id ?? "new"} action={saveBlock} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="ইউনিয়ন / পৌরসভা *">
              <select name="unionId" required defaultValue={editing?.unionId ?? ""} className={inputCls}>
                <option value="" disabled>
                  বেছে নিন
                </option>
                {unions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ব্লকের নাম *" hint="যেমন: হলদিয়া-২">
              <input name="name" required defaultValue={editing?.name} className={inputCls} />
            </Field>
            <Field label="দায়িত্বপ্রাপ্ত কর্মকর্তা">
              <select name="staffId" defaultValue={editing?.staffId ?? ""} className={inputCls}>
                <option value="">— এখনো দেওয়া হয়নি —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            {staff.length === 0 && (
              <p className="text-sm text-muted">
                তালিকায় কর্মকর্তা দেখাতে আগে{" "}
                <Link href="/master/staff" className="font-semibold text-brand">
                  কর্মকর্তা যোগ করুন
                </Link>
                । ব্লক এখনই যোগ করে পরে কর্মকর্তা দেওয়া যাবে।
              </p>
            )}
            <div className="flex gap-3">
              <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{editing ? "পরিবর্তন সংরক্ষণ" : "ব্লক যোগ করুন"}</SubmitButton>
              {editing && <CancelLink href="/master/blocks" />}
            </div>
          </form>
        </Card>

        <Card title={`ইউনিয়নভিত্তিক ব্লক (মোট ${toBn(allBlocks.length)}টি)`}>
          <div className="divide-y divide-line">
            {unions.map((u) => (
              <div key={u.id} className="py-3 first:pt-0">
                <div className="mb-1.5 flex items-baseline gap-2">
                  <h3 className="font-bold">{u.name}</h3>
                  <span className="text-sm text-muted">{toBn(u.blocks.length)}টি ব্লক</span>
                </div>
                {u.blocks.length === 0 ? (
                  <p className="text-sm text-muted">কোনো ব্লক যোগ করা হয়নি।</p>
                ) : (
                  <ul className="space-y-1">
                    {u.blocks.map((b) => (
                      <li key={b.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-paper">
                        <span className="w-40 font-medium">{b.name}</span>
                        <span className="flex-1 text-sm text-muted">{b.staff?.name ?? "কর্মকর্তা দেওয়া হয়নি"}</span>
                        <Link href={`/master/blocks?edit=${b.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        {b._count.demonstrations === 0 && b._count.farmers === 0 && (
                          <form action={deleteBlock}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" className={smallBtnCls}>
                              মুছুন
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
