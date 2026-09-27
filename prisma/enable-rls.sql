-- public স্কিমার সব টেবিলে Row Level Security চালু করে।
-- এতে ব্রাউজারে থাকা anon key দিয়ে কেউ সরাসরি টেবিল পড়তে/লিখতে পারবে না।
-- অ্যাপ Prisma দিয়ে postgres রোলে সংযুক্ত হয়, তাই অ্যাপের কাজে কোনো প্রভাব পড়বে না।
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
