import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { profileUpdateSchema } from "@/lib/validators/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
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

  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = profileUpdateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        errors: parsedBody.error.flatten().fieldErrors,
        message: "Revise os campos informados.",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    data: {
      city: parsedBody.data.city || null,
      name: parsedBody.data.name,
      phone: parsedBody.data.phone || null,
      profession: parsedBody.data.profession,
      specialty: parsedBody.data.specialty || null,
    },
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

  return NextResponse.json({ user });
}
