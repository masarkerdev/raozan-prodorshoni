const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** ইংরেজি অঙ্ককে বাংলা অঙ্কে রূপান্তর: 186 → ১৮৬ */
export function toBn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** তারিখ বাংলায়: ০৫ জানুয়ারি ২০২৬ */
export function formatDateBn(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
