import { requireUser } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, inputCls } from "@/components/ui";
import { changeOwnPassword } from "../users/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const me = await requireUser();
  const { ok, err } = await searchParams;

  return (
    <>
      <PageHeader title="আমার অ্যাকাউন্ট" />
      <Flash ok={ok} err={err} />
      <div className="grid max-w-3xl items-start gap-5 md:grid-cols-2">
        <Card title="তথ্য">
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted">নাম</dt>
              <dd className="font-medium">{me.name}</dd>
            </div>
            {me.designation && (
              <div>
                <dt className="text-sm text-muted">পদবি</dt>
                <dd className="font-medium">{me.designation}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted">ইমেইল</dt>
              <dd className="font-medium">{me.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">ভূমিকা</dt>
              <dd className="font-medium">{me.role === "ADMIN" ? "অ্যাডমিন" : "অপারেটর"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="পাসওয়ার্ড পরিবর্তন">
          <form action={changeOwnPassword} className="space-y-4">
            <Field label="বর্তমান পাসওয়ার্ড *">
              <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Field label="নতুন পাসওয়ার্ড *" hint="কমপক্ষে ৮ অক্ষর">
              <input name="next" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="নতুন পাসওয়ার্ড আবার লিখুন *">
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <SubmitButton pendingText="পরিবর্তন হচ্ছে…">পাসওয়ার্ড পরিবর্তন করুন</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
