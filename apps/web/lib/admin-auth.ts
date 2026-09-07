import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export const ADMIN_COOKIE = "gift-chaos-admin";
export function expectedAdminToken() { const password = process.env.ADMIN_PASSWORD ?? ""; const secret = process.env.AUTH_SECRET ?? ""; if (!password || !secret) return ""; return createHash("sha256").update(`${password}:${secret}`).digest("hex"); }
export async function isAdmin() { const token = (await cookies()).get(ADMIN_COOKIE)?.value ?? ""; const expected = expectedAdminToken(); if (!token || !expected) return false; const a=Buffer.from(token); const b=Buffer.from(expected); return a.length===b.length && timingSafeEqual(a,b); }
