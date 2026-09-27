import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// রাউজান উপজেলা: ১টি পৌরসভা + ১৪টি ইউনিয়ন
const unions: Array<[string, boolean]> = [
  ["রাউজান পৌরসভা", true],
  ["রাউজান", false],
  ["হলদিয়া", false],
  ["ডাবুয়া", false],
  ["চিকদাইর", false],
  ["গহিরা", false],
  ["বাগোয়ান", false],
  ["নোয়াপাড়া", false],
  ["পাহাড়তলী", false],
  ["কদলপুর", false],
  ["উরকিরচর", false],
  ["নোয়াজিশপুর", false],
  ["বিনাজুরী", false],
  ["পূর্ব গুজরা", false],
  ["পশ্চিম গুজরা", false],
];

const fiscalYears = [
  { label: "২০২৫-২৬", startDate: new Date("2025-07-01"), endDate: new Date("2026-06-30"), isActive: false },
  { label: "২০২৬-২৭", startDate: new Date("2026-07-01"), endDate: new Date("2027-06-30"), isActive: true },
];

// সাধারণ ফসল (জাত মাস্টার ডেটা পেজ থেকে যোগ করবেন)
const crops: Array<[string, string]> = [
  ["আউশ ধান", "দানাশস্য"], ["আমন ধান", "দানাশস্য"], ["বোরো ধান", "দানাশস্য"],
  ["গম", "দানাশস্য"], ["ভুট্টা", "দানাশস্য"],
  ["মুগ", "ডাল"], ["মসুর", "ডাল"], ["মাসকলাই", "ডাল"], ["খেসারি", "ডাল"], ["ফেলন", "ডাল"],
  ["সরিষা", "তেলবীজ"], ["চিনাবাদাম", "তেলবীজ"], ["সূর্যমুখী", "তেলবীজ"], ["তিল", "তেলবীজ"],
  ["আলু", "কন্দাল"], ["মিষ্টি আলু", "কন্দাল"],
  ["টমেটো", "সবজি"], ["বেগুন", "সবজি"], ["লাউ", "সবজি"], ["মিষ্টি কুমড়া", "সবজি"],
  ["করলা", "সবজি"], ["শিম", "সবজি"], ["বাঁধাকপি", "সবজি"], ["ফুলকপি", "সবজি"], ["ঢেঁড়স", "সবজি"],
  ["মরিচ", "মসলা"], ["পেঁয়াজ", "মসলা"], ["রসুন", "মসলা"], ["আদা", "মসলা"], ["হলুদ", "মসলা"],
  ["আম", "ফল"], ["মাল্টা", "ফল"], ["পেয়ারা", "ফল"], ["লিচু", "ফল"], ["কলা", "ফল"],
  ["পেঁপে", "ফল"], ["ড্রাগন ফল", "ফল"], ["লেবু", "ফল"],
];

async function main() {
  for (const [i, [name, isPourashava]] of unions.entries()) {
    await prisma.union.upsert({
      where: { name },
      update: { isPourashava, sortOrder: i },
      create: { name, isPourashava, sortOrder: i },
    });
  }
  console.log(`✓ ${unions.length}টি ইউনিয়ন/পৌরসভা`);

  for (const fy of fiscalYears) {
    await prisma.fiscalYear.upsert({ where: { label: fy.label }, update: fy, create: fy });
  }
  console.log(`✓ ${fiscalYears.length}টি অর্থবছর`);

  await prisma.fundingSource.upsert({
    where: { name_type: { name: "রাজস্ব খাত", type: "REVENUE" } },
    update: {},
    create: { name: "রাজস্ব খাত", shortName: "রাজস্ব", type: "REVENUE" },
  });
  console.log("✓ রাজস্ব খাত");

  for (const [name, category] of crops) {
    await prisma.crop.upsert({ where: { name }, update: {}, create: { name, category } });
  }
  console.log(`✓ ${crops.length}টি ফসল`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", isActive: true },
      create: { email, name: process.env.ADMIN_NAME?.trim() || "অ্যাডমিন", role: "ADMIN" },
    });
    console.log(`✓ অ্যাডমিন: ${email}`);
  } else {
    console.warn("! ADMIN_EMAIL দেওয়া নেই — অ্যাডমিন তৈরি হয়নি");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
