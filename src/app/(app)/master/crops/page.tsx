import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, Field, inputCls, smallBtnCls } from "@/components/ui";
import { deleteCrop, deleteVariety, saveCrop, saveVariety } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["দানাশস্য", "ডাল", "তেলবীজ", "সবজি", "কন্দাল", "মসলা", "ফল", "অন্যান্য"];

type SP = Promise<{ ok?: string; err?: string; edit?: string; crop?: string }>;

export default async function CropsPage({ searchParams }: { searchParams: SP }) {
  const { ok, err, edit, crop } = await searchParams;

  const crops = await prisma.crop.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { varieties: true, demonstrations: true } } },
  });
  const editing = edit ? crops.find((c) => c.id === edit) : undefined;
  const selected = crops.find((c) => c.id === crop) ?? null;
  const varieties = selected
    ? await prisma.variety.findMany({
        where: { cropId: selected.id },
        orderBy: { name: "asc" },
        include: { _count: { select: { demonstrations: true } } },
      })
    : [];

  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="ফসল">
          <form
            key={editing?.id ?? "new"}
            action={saveCrop}
            className="mb-5 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label={editing ? "ফসলের নাম সম্পাদনা *" : "নতুন ফসল *"}>
              <input name="name" required defaultValue={editing?.name} className={inputCls} />
            </Field>
            <Field label="শ্রেণি">
              <select name="category" defaultValue={editing?.category ?? ""} className={inputCls}>
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <SubmitButton pendingText="…">{editing ? "সংরক্ষণ" : "যোগ"}</SubmitButton>
              {editing && <CancelLink href={`/master/crops?crop=${editing.id}`} />}
            </div>
          </form>

          <ul className="divide-y divide-[#f0ece0]">
            {crops.length === 0 && <li className="py-6 text-center text-muted">এখনো কোনো ফসল যোগ করা হয়নি।</li>}
            {crops.map((c) => {
              const isSel = selected?.id === c.id;
              return (
                <li key={c.id} className={`flex items-center gap-3 py-2 ${isSel ? "bg-brand-soft -mx-2 rounded-lg px-2" : ""}`}>
                  <Link
                    href={`/master/crops?crop=${c.id}`}
                    aria-current={isSel ? "true" : undefined}
                    className="flex min-h-10 flex-1 items-center gap-2"
                  >
                    <span className="font-semibold">{c.name}</span>
                    {c.category && <span className="text-sm text-muted">{c.category}</span>}
                    <span className="ml-auto text-sm text-muted">{toBn(c._count.varieties)}টি জাত</span>
                  </Link>
                  <Link href={`/master/crops?crop=${c.id}&edit=${c.id}`} className={smallBtnCls}>
                    সম্পাদনা
                  </Link>
                  {c._count.varieties === 0 && c._count.demonstrations === 0 && (
                    <form action={deleteCrop}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className={smallBtnCls}>
                        মুছুন
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={selected ? `${selected.name} — জাত` : "জাত"}>
          {!selected ? (
            <p className="py-6 text-center text-muted">বাম পাশের তালিকা থেকে একটি ফসল বেছে নিন।</p>
          ) : (
            <>
              <form key={selected.id} action={saveVariety} className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="cropId" value={selected.id} />
                <Field label="নতুন জাত *" hint="যেমন: ব্রি ধান৮৯, বারি সরিষা-১৪">
                  <input name="name" required className={inputCls} />
                </Field>
                <div className="sm:mb-5">
                  <SubmitButton pendingText="…">যোগ</SubmitButton>
                </div>
              </form>
              <ul className="divide-y divide-[#f0ece0]">
                {varieties.length === 0 && (
                  <li className="py-6 text-center text-muted">এই ফসলের কোনো জাত এখনো যোগ করা হয়নি।</li>
                )}
                {varieties.map((v) => (
                  <li key={v.id} className="flex min-h-12 items-center justify-between gap-3 py-1.5">
                    <span>{v.name}</span>
                    {v._count.demonstrations === 0 ? (
                      <form action={deleteVariety}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="cropId" value={selected.id} />
                        <button type="submit" className={smallBtnCls}>
                          মুছুন
                        </button>
                      </form>
                    ) : (
                      <span className="text-sm text-muted">{toBn(v._count.demonstrations)}টি প্রদর্শনীতে ব্যবহৃত</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
