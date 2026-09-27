import { PrismaClient } from "@prisma/client";

// ডেভেলপমেন্টে হট-রিলোডের সময় একাধিক কানেকশন তৈরি হওয়া আটকায়
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
