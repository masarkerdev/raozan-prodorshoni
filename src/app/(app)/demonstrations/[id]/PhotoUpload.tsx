"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_STAGES } from "@/lib/demo";
import { Field, inputCls } from "@/components/ui";
import { toBn } from "@/lib/format";

/** মোবাইলের বড় ছবি আপলোডের আগে ছোট করা (সর্বোচ্চ ১৬০০ px, JPG) */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // ব্রাউজার ছোট করতে না পারলে মূল ফাইলই পাঠানো হয়
  }
}

export function PhotoUpload({
  demonstrationId,
  upload,
}: {
  demonstrationId: string;
  upload: (fd: FormData) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = (form.elements.namedItem("files") as HTMLInputElement).files;
    if (!files || files.length === 0) {
      setError("ছবি বেছে নিন।");
      return;
    }
    setError("");
    setDone("");

    let count = 0;
    for (const [i, original] of Array.from(files).entries()) {
      setProgress(`${toBn(i + 1)}/${toBn(files.length)} আপলোড হচ্ছে…`);
      const file = await shrink(original);
      const fd = new FormData();
      fd.set("demonstrationId", demonstrationId);
      fd.set("stage", String(data.get("stage") ?? "OTHER"));
      fd.set("caption", String(data.get("caption") ?? ""));
      fd.set("takenOn", String(data.get("takenOn") ?? ""));
      fd.set("file", file, file.name);
      const res = await upload(fd);
      if (res.error) {
        setError(`${original.name}: ${res.error}`);
        break;
      }
      count++;
    }

    setProgress("");
    if (count > 0) {
      setDone(`${toBn(count)}টি ছবি যোগ হয়েছে।`);
      form.reset();
      startTransition(() => router.refresh());
    }
  }

  const busy = progress !== "" || pending;

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="ছবি *" hint="একসাথে একাধিক ছবি বেছে নিতে পারেন। মোবাইলে সরাসরি ক্যামেরাও খুলবে।">
          <input name="files" type="file" accept="image/*" multiple required className={`${inputCls} py-2`} />
        </Field>
      </div>
      <Field label="পর্যায়">
        <select name="stage" defaultValue="INSPECTION" className={inputCls}>
          {PHOTO_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="ছবির তারিখ">
        <input name="takenOn" type="date" className={inputCls} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="বিবরণ">
          <input name="caption" className={inputCls} />
        </Field>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-[#f2e3df] px-3 py-2 text-sm text-[#8a2d1f] sm:col-span-2">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand sm:col-span-2">
          {done}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark disabled:opacity-70 sm:col-span-2"
      >
        {progress || (pending ? "হালনাগাদ হচ্ছে…" : "ছবি আপলোড করুন")}
      </button>
    </form>
  );
}
