import { PageHeader } from "@/components/PageHeader";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-muted">
        {description}
      </div>
    </>
  );
}
