import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar name={user.name} role={user.role} />
      <main className="min-w-0 flex-1 px-8 py-7 print:p-0">{children}</main>
    </div>
  );
}
