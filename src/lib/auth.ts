import { cookies } from "next/headers";
import prisma from "./prisma";
import crypto from "crypto";
import { cache } from "react";

// For hashing passwords in Node.js (salt + hash)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hashAsBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hashAsBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set("fast_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("fast_session")?.value;
  if (!sessionId) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sessionId } });
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
});

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("fast_session")?.value;
  if (sessionId) {
    try {
      await prisma.session.delete({ where: { id: sessionId } });
    } catch (e) {}
  }
  cookieStore.delete("fast_session");
}
