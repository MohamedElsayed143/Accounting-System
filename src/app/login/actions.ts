"use server";

import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user) {
      return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
    }

    const isValid = verifyPassword(password, user.password);
    
    // Fallback: IF it's a new system and the admin was freshly created in Studio and NOT hashed yet, 
    // allow literal password match for the VERY FIRST TIME, and hash it on the fly.
    // (Helps the user who will just type 'admin' directly into Prisma Studio).
    let isPasswordOk = isValid;
    if (!isPasswordOk && user.password === password) {
       // It matches perfectly but wasn't hashed. Let's hash it!
       const { hashPassword } = await import("@/lib/auth");
       await prisma.user.update({
         where: { id: user.id },
         data: { password: hashPassword(password) }
       });
       isPasswordOk = true;
    }

    if (!isPasswordOk) {
      return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    await setSessionCookie(session.id);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً." };
  }
}

export async function logoutAction() {
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
}

export async function getAuthSession() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) return null;
  
  return {
    user: {
      username: session.user.username,
      role: session.user.role,
    }
  };
}
