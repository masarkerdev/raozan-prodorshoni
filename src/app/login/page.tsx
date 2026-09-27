import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signIn } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const ERRORS: Record<string, string> = {
  missing: "ইমেইল ও পাসওয়ার্ড দুটোই লিখুন।",
  invalid: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
  unauthorized:
    "এই ইমেইলটি সিস্টেমে ব্যবহারকারী হিসেবে যুক্ত নেই বা নিষ্ক্রিয়। অ্যাডমিনের সাথে যোগাযোগ করুন।",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");

  const { error } = await searchParams;
  const message = error ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-brand">প্রদর্শনী রেজিস্টার</h1>
          <p className="mt-1 text-muted">উপজেলা কৃষি অফিস, রাউজান, চট্টগ্রাম</p>
        </div>

        <form action={signIn} className="space-y-5 rounded-xl border border-line bg-white p-6">
          {message && (
            <p role="alert" className="rounded-lg bg-ochre-soft px-3 py-2 text-sm text-[#7a4e0c]">
              {message}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium">ইমেইল</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="min-h-11 w-full rounded-lg border border-[#d6cfbb] px-3 outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">পাসওয়ার্ড</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-11 w-full rounded-lg border border-[#d6cfbb] px-3 outline-none focus:border-brand"
            />
          </label>

          <SubmitButton pendingText="প্রবেশ করা হচ্ছে…">প্রবেশ করুন</SubmitButton>
        </form>
      </div>
    </main>
  );
}
