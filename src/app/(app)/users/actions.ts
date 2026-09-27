"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ActionError, mapError, str } from "@/lib/form";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function run(path: string, fn: () => Promise<string | void>, okCode = "saved") {
  let err: string | null = null;
  let ok = okCode;
  try {
    const result = await fn();
    if (result) ok = result;
  } catch (e) {
    err = mapError(e);
  }
  const sep = path.includes("?") ? "&" : "?";
  if (err) redirect(`${path}${sep}err=${err}`);
  revalidatePath(path.split("?")[0]);
  redirect(`${path}${sep}ok=${ok}`);
}

function role(fd: FormData): UserRole {
  return str(fd, "role") === "ADMIN" ? "ADMIN" : "OPERATOR";
}

// ---------------------------------------------------------------
// নতুন ব্যবহারকারী: লগইন অ্যাকাউন্ট + অ্যাপের রেকর্ড একসাথে
// ---------------------------------------------------------------

export async function createUser(fd: FormData) {
  await requireAdmin();
  await run("/users", async () => {
    const name = str(fd, "name");
    const email = str(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (!name || !email || !password) throw new ActionError("required");
    if (password.length < 8) throw new ActionError("weakpass");

    const admin = supabaseAdmin();
    if (!admin) throw new ActionError("nokey");

    if (await prisma.user.findUnique({ where: { email } })) throw new ActionError("duplicate");

    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const alreadyExists = !!error && /already|registered|exists/i.test(error.message);
    if (error && !alreadyExists) {
      console.error(error);
      throw new ActionError("authfail");
    }

    await prisma.user.create({
      data: {
        name,
        email,
        designation: str(fd, "designation") || null,
        role: role(fd),
        // আগে থেকে লগইন অ্যাকাউন্ট থাকলে প্রথম লগইনে authId যুক্ত হবে
        authId: data?.user?.id ?? null,
      },
    });
    return alreadyExists ? "linked" : "usercreated";
  });
}

// ---------------------------------------------------------------
// তথ্য হালনাগাদ
// ---------------------------------------------------------------

export async function updateUser(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  await run("/users", async () => {
    const name = str(fd, "name");
    if (!name) throw new ActionError("required");
    const newRole = role(fd);
    if (id === me.id && newRole !== "ADMIN") throw new ActionError("self");
    await prisma.user.update({
      where: { id },
      data: { name, designation: str(fd, "designation") || null, role: newRole },
    });
  });
}

export async function toggleUserActive(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  await run(
    "/users",
    async () => {
      if (id === me.id) throw new ActionError("self");
      const u = await prisma.user.findUniqueOrThrow({ where: { id } });
      await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
    },
    "updated",
  );
}

export async function resetUserPassword(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await run(
    `/users?edit=${id}`,
    async () => {
      const password = String(fd.get("password") ?? "");
      if (password.length < 8) throw new ActionError("weakpass");
      const admin = supabaseAdmin();
      if (!admin) throw new ActionError("nokey");
      const u = await prisma.user.findUniqueOrThrow({ where: { id } });
      if (!u.authId) throw new ActionError("authfail");
      const { error } = await admin.auth.admin.updateUserById(u.authId, { password });
      if (error) {
        console.error(error);
        throw new ActionError("authfail");
      }
    },
    "password",
  );
}

// ---------------------------------------------------------------
// নিজের পাসওয়ার্ড পরিবর্তন (সব ব্যবহারকারী)
// ---------------------------------------------------------------

export async function changeOwnPassword(fd: FormData) {
  const me = await requireUser();
  await run(
    "/account",
    async () => {
      const current = String(fd.get("current") ?? "");
      const next = String(fd.get("next") ?? "");
      const confirm = String(fd.get("confirm") ?? "");
      if (!current || !next) throw new ActionError("required");
      if (next.length < 8) throw new ActionError("weakpass");
      if (next !== confirm) throw new ActionError("mismatch");

      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: me.email, password: current });
      if (signInError) throw new ActionError("wrongpass");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        console.error(error);
        throw new ActionError("authfail");
      }
    },
    "password",
  );
}
