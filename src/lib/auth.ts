import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * লগইন করা ব্যবহারকারী খুঁজে বের করে।
 * Supabase-এ লগইন থাকলেও অ্যাপের User টেবিলে সক্রিয় না থাকলে null ফেরত দেয়।
 * অ্যাডমিন আগে ইমেইল দিয়ে User তৈরি করেন; প্রথম লগইনে authId যুক্ত হয়।
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let appUser = await prisma.user.findUnique({ where: { authId: user.id } });

  if (!appUser && user.email) {
    const pending = await prisma.user.findFirst({
      where: { email: user.email.toLowerCase(), authId: null },
    });
    if (pending) {
      appUser = await prisma.user.update({
        where: { id: pending.id },
        data: { authId: user.id },
      });
    }
  }

  if (!appUser || !appUser.isActive) return null;
  return appUser;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=unauthorized");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/?error=forbidden");
  return user;
}
