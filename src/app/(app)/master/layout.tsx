import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { MasterTabs } from "@/components/MasterTabs";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="মাস্টার ডেটা" subtitle="প্রদর্শনী এন্ট্রির আগে এই তথ্যগুলো সাজিয়ে নিন" />
      <MasterTabs />
      <div className="mt-5">{children}</div>
    </>
  );
}
