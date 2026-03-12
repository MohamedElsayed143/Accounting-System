"use server";

import prisma from "@/lib/prisma";
import { verifyPassword, getSession } from "@/lib/auth";

export async function verifyPasswordAction(password: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { error: "غير مصرح به. يرجى تسجيل الدخول مجدداً." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { error: "المستخدم غير موجود." };
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return { error: "كلمة المرور غير صحيحة." };
    }

    return { success: true };
  } catch (error) {
    console.error("Password verification error:", error);
    return { error: "حدث خطأ أثناء التحقق من كلمة المرور." };
  }
}
