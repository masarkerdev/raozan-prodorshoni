import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** secret key দিয়ে Supabase — শুধু সার্ভারে ব্যবহার্য (ব্যবহারকারী তৈরি, পাসওয়ার্ড রিসেট) */
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
