import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ছবি রাখা হয় একটি প্রাইভেট bucket-এ; শুধু সার্ভার secret key দিয়ে পড়ে/লেখে,
// আর ব্রাউজারকে ১ ঘণ্টার জন্য বৈধ লিংক (signed URL) দেয়।
export const PHOTO_BUCKET = "demo-photos";

let client: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function admin(): SupabaseClient {
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY .env ফাইলে দেওয়া হয়নি");
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { error } = await admin().storage.getBucket(PHOTO_BUCKET);
      if (error) {
        const { error: createError } = await admin().storage.createBucket(PHOTO_BUCKET, {
          public: false,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        });
        if (createError && !/already exists/i.test(createError.message)) {
          bucketReady = null;
          throw createError;
        }
      }
    })();
  }
  return bucketReady;
}

export async function uploadPhotoFile(path: string, file: Blob, contentType: string) {
  await ensureBucket();
  const { error } = await admin().storage.from(PHOTO_BUCKET).upload(path, file, { contentType, upsert: false });
  if (error) throw error;
}

export async function removePhotoFiles(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await admin().storage.from(PHOTO_BUCKET).remove(paths);
  if (error) console.error("ছবি মুছতে সমস্যা:", error.message);
}

/** path → ১ ঘণ্টার জন্য বৈধ লিংক */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await admin().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error || !data) {
    console.error("ছবির লিংক তৈরি করা যায়নি:", error?.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
