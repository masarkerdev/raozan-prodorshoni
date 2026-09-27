import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toBn } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CancelLink, Field, StatusBadge, inputCls, smallBtnCls, tdCls, thCls } from "@/components/ui";
import { createUser, resetUserPassword, toggleUserActive, updateUser } from "./actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ ok?: string; err?: string; edit?: string }>;

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const { ok, err, edit } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { _count: { select: { demonstrationsCreated: true } } },
  });
  const editing = edit ? users.find((u) => u.id === edit) : undefined;
  const roleSelect = (value: string, disabled?: boolean) => (
    <select name="role" defaultValue={value} disabled={disabled} className={inputCls}>
      <option value="OPERATOR">অপারেটর — এন্ট্রি ও সম্পাদনা</option>
      <option value="ADMIN">অ্যাডমিন — সব কিছু</option>
    </select>
  );

  return (
    <>
      <PageHeader title="ব্যবহারকারী" subtitle="কে সিস্টেমে ঢুকতে পারবেন ও কী করতে পারবেন" />
      <Flash ok={ok} err={err} />

      <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
        {editing ? (
          <div className="flex flex-col gap-5">
            <Card title="ব্যবহারকারীর তথ্য সম্পাদনা">
              <form key={editing.id} action={updateUser} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <Field label="ইমেইল">
                  <input value={editing.email} readOnly className={`${inputCls} bg-paper`} />
                </Field>
                <Field label="নাম *">
                  <input name="name" required defaultValue={editing.name} className={inputCls} />
                </Field>
                <Field label="পদবি">
                  <input name="designation" defaultValue={editing.designation ?? ""} className={inputCls} />
                </Field>
                <Field label="ভূমিকা" hint={editing.id === me.id ? "নিজের অ্যাডমিন পদ বদলানো যায় না" : undefined}>
                  {editing.id === me.id ? (
                    <>
                      <input type="hidden" name="role" value="ADMIN" />
                      {roleSelect("ADMIN", true)}
                    </>
                  ) : (
                    roleSelect(editing.role)
                  )}
                </Field>
                <div className="flex gap-3">
                  <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">পরিবর্তন সংরক্ষণ</SubmitButton>
                  <CancelLink href="/users" />
                </div>
              </form>
            </Card>

            <Card title="নতুন পাসওয়ার্ড নির্ধারণ">
              {editing.authId ? (
                <form action={resetUserPassword} className="space-y-4">
                  <input type="hidden" name="id" value={editing.id} />
                  <Field label="নতুন পাসওয়ার্ড *" hint="কমপক্ষে ৮ অক্ষর। পরে ব্যবহারকারীকে জানিয়ে দিন।">
                    <input name="password" type="text" required minLength={8} autoComplete="off" className={inputCls} />
                  </Field>
                  <SubmitButton pendingText="হালনাগাদ হচ্ছে…">পাসওয়ার্ড বদলান</SubmitButton>
                </form>
              ) : (
                <p className="text-muted">এই ব্যবহারকারী এখনো একবারও লগইন করেননি, তাই পাসওয়ার্ড বদলানো যাবে না।</p>
              )}
            </Card>
          </div>
        ) : (
          <Card title="নতুন ব্যবহারকারী যোগ">
            <form action={createUser} className="space-y-4">
              <Field label="নাম *">
                <input name="name" required className={inputCls} />
              </Field>
              <Field label="পদবি" hint="যেমন: কৃষি সম্প্রসারণ অফিসার">
                <input name="designation" className={inputCls} />
              </Field>
              <Field label="ইমেইল *" hint="এই ইমেইল দিয়ে লগইন করবেন">
                <input name="email" type="email" required autoComplete="off" className={inputCls} />
              </Field>
              <Field label="প্রাথমিক পাসওয়ার্ড *" hint="কমপক্ষে ৮ অক্ষর। প্রথম লগইনের পর নিজে বদলে নিতে বলুন।">
                <input name="password" type="text" required minLength={8} autoComplete="off" className={inputCls} />
              </Field>
              <Field label="ভূমিকা">{roleSelect("OPERATOR")}</Field>
              <SubmitButton pendingText="তৈরি হচ্ছে…">ব্যবহারকারী তৈরি করুন</SubmitButton>
            </form>
          </Card>
        )}

        <Card title="ব্যবহারকারীদের তালিকা">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr>
                  <th className={thCls}>নাম ও ইমেইল</th>
                  <th className={thCls}>ভূমিকা</th>
                  <th className={thCls}>এন্ট্রি</th>
                  <th className={thCls}>অবস্থা</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className={tdCls}>
                      <div className="font-semibold">
                        {u.name}
                        {u.id === me.id && <span className="ml-2 text-sm font-normal text-muted">(আপনি)</span>}
                      </div>
                      <div className="text-sm text-muted">{u.email}</div>
                      {u.designation && <div className="text-sm text-muted">{u.designation}</div>}
                    </td>
                    <td className={tdCls}>{u.role === "ADMIN" ? "অ্যাডমিন" : "অপারেটর"}</td>
                    <td className={tdCls}>{toBn(u._count.demonstrationsCreated)}টি</td>
                    <td className={tdCls}>
                      <StatusBadge active={u.isActive} />
                      {!u.authId && <div className="mt-1 text-xs text-muted">এখনো লগইন করেননি</div>}
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <Link href={`/users?edit=${u.id}`} className={smallBtnCls}>
                          সম্পাদনা
                        </Link>
                        {u.id !== me.id && (
                          <form action={toggleUserActive}>
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit" className={smallBtnCls}>
                              {u.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
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
            অপারেটর প্রদর্শনী যোগ, সম্পাদনা, পরিদর্শন-ছবি-ফলাফল দিতে ও রিপোর্ট দেখতে পারবেন; মাস্টার ডেটা, ব্যবহারকারী আর প্রদর্শনী মুছে ফেলা
            শুধু অ্যাডমিনের জন্য। কেউ অফিস ছেড়ে গেলে নিষ্ক্রিয় করুন, তার করা এন্ট্রিগুলো ঠিক থাকবে।
          </p>
        </Card>
      </div>
    </>
  );
}
