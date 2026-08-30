import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const session = await requireSession();

  return prisma.user.findUniqueOrThrow({
    select: {
      avatarUrl: true,
      city: true,
      email: true,
      id: true,
      name: true,
      phone: true,
      profession: true,
      specialty: true,
    },
    where: { id: session.user.id },
  });
}
