const OK: Record<string, string> = {
  saved: "সংরক্ষণ করা হয়েছে।",
  created: "নতুন প্রদর্শনী যোগ করা হয়েছে।",
  updated: "হালনাগাদ করা হয়েছে।",
  deleted: "মুছে ফেলা হয়েছে।",
  result: "ফলাফল সংরক্ষণ করা হয়েছে।",
  usercreated: "ব্যবহারকারী তৈরি হয়েছে। তাকে ইমেইল ও পাসওয়ার্ড জানিয়ে দিন।",
  linked: "ব্যবহারকারী যোগ হয়েছে। এই ইমেইলে আগে থেকেই লগইন অ্যাকাউন্ট থাকায় তিনি আগের পাসওয়ার্ড দিয়েই ঢুকতে পারবেন।",
  password: "পাসওয়ার্ড পরিবর্তন করা হয়েছে।",
};

const ERR: Record<string, string> = {
  required: "তারকা (*) চিহ্নিত ঘরগুলো পূরণ করুন।",
  duplicate: "এই নামে বা এই সমন্বয়ে আগে থেকেই একটি রেকর্ড আছে।",
  inuse: "এটি অন্য রেকর্ডে ব্যবহৃত হচ্ছে, তাই মোছা যাবে না।",
  invalid: "সংখ্যার ঘরে শুধু সংখ্যা লিখুন।",
  dates: "শুরুর তারিখ শেষের তারিখের আগে হতে হবে।",
  unknown: "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  weakpass: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।",
  mismatch: "দুই ঘরের নতুন পাসওয়ার্ড মেলেনি।",
  wrongpass: "বর্তমান পাসওয়ার্ড সঠিক নয়।",
  self: "নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা বা অ্যাডমিন পদ থেকে সরানো যাবে না।",
  nokey: "এই কাজের জন্য .env ফাইলে SUPABASE_SERVICE_ROLE_KEY লাগবে।",
  authfail: "লগইন অ্যাকাউন্ট তৈরি বা হালনাগাদ করা যায়নি। ইমেইল ঠিক আছে কিনা দেখে আবার চেষ্টা করুন।",
};

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err && ERR[err]) {
    return (
      <p role="alert" className="mb-5 rounded-lg bg-[#f2e3df] px-4 py-2.5 text-[#8a2d1f]">
        {ERR[err]}
      </p>
    );
  }
  if (ok && OK[ok]) {
    return (
      <p role="status" className="mb-5 rounded-lg bg-brand-soft px-4 py-2.5 text-brand">
        {OK[ok]}
      </p>
    );
  }
  return null;
}
