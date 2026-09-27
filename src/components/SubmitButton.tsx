"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-lg bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-70"
    >
      {pending ? pendingText : children}
    </button>
  );
}
