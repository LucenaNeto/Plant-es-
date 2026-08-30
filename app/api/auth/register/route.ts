import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = registerSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        errors: parsedBody.error.flatten().fieldErrors,
        message: "Revise os campos informados.",
      },
      { status: 400 },
    );
  }

  const { email, name, password, profession, specialty } = parsedBody.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        profession,
        specialty: specialty || null,
      },
      select: {
        email: true,
        id: true,
        name: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Não foi possível criar a conta agora." },
      { status: 500 },
    );
  }
}
