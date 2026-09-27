import { Prisma } from "@prisma/client";

/** ব্যবহারকারীকে দেখানোর মতো ভুলের কোড (Flash কম্পোনেন্টে বার্তা আছে) */
export class ActionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

/** বাংলা বা ইংরেজি অঙ্ক দুটোই গ্রহণ করে; কমা বাদ দেয় */
export function optNum(fd: FormData, key: string): number | null {
  const raw = toAscii(str(fd, key)).replace(/,/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new ActionError("invalid");
  return n;
}

export function reqNum(fd: FormData, key: string): number {
  const n = optNum(fd, key);
  if (n === null) throw new ActionError("required");
  return n;
}

export function optDate(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ActionError("invalid");
  return d;
}

export function reqDate(fd: FormData, key: string): Date {
  const d = optDate(fd, key);
  if (!d) throw new ActionError("required");
  return d;
}

export function mapError(e: unknown): string {
  if (e instanceof ActionError) return e.code;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "duplicate";
    if (e.code === "P2003") return "inuse";
  }
  console.error(e);
  return "unknown";
}
