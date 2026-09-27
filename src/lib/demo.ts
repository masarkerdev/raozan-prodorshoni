// প্রদর্শনী সংক্রান্ত লেবেল — সার্ভার ও ক্লায়েন্ট দুই জায়গাতেই ব্যবহারযোগ্য

export const SEASONS = [
  { value: "RABI", label: "রবি" },
  { value: "KHARIF1", label: "খরিফ-১" },
  { value: "KHARIF2", label: "খরিফ-২" },
  { value: "YEAR_ROUND", label: "সারা বছর" },
] as const;

export const STATUSES = [
  { value: "PLANNED", label: "পরিকল্পিত", cls: "bg-[#ecebe6] text-[#55554d]" },
  { value: "ESTABLISHED", label: "স্থাপিত", cls: "bg-ochre-soft text-[#7a4e0c]" },
  { value: "ONGOING", label: "চলমান", cls: "bg-ochre-soft text-[#7a4e0c]" },
  { value: "HARVESTED", label: "কর্তন সম্পন্ন", cls: "bg-[#e1eaf6] text-[#1d4f91]" },
  { value: "COMPLETED", label: "সম্পন্ন", cls: "bg-brand-soft text-brand" },
  { value: "CANCELLED", label: "বাতিল", cls: "bg-[#f2e3df] text-[#8a2d1f]" },
] as const;

export function seasonLabel(value: string): string {
  return SEASONS.find((s) => s.value === value)?.label ?? value;
}

export function statusInfo(value: string) {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}

export const PHOTO_STAGES = [
  { value: "ESTABLISHMENT", label: "স্থাপন" },
  { value: "SIGNBOARD", label: "সাইনবোর্ড" },
  { value: "GROWTH", label: "বৃদ্ধি পর্যায়" },
  { value: "INSPECTION", label: "পরিদর্শন" },
  { value: "HARVEST", label: "কর্তন" },
  { value: "FIELD_DAY", label: "মাঠ দিবস" },
  { value: "OTHER", label: "অন্যান্য" },
] as const;

export function photoStageLabel(value: string): string {
  return PHOTO_STAGES.find((s) => s.value === value)?.label ?? value;
}

export const INPUT_UNITS = ["কেজি", "গ্রাম", "লিটার", "মিলি", "প্যাকেট", "টি", "বস্তা", "সেট"];
export const CROP_CONDITIONS = ["ভালো", "মাঝারি", "দুর্বল"];
export const YIELD_UNITS = ["টন/হেক্টর", "কেজি/শতাংশ", "মণ/বিঘা"];
