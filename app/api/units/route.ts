import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { serializeUnit } from "@/lib/units/serializer";
import { unitPayloadSchema } from "@/lib/validators/units";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const units = await prisma.unit.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    where: { userId: session.user.id },
  });

  return NextResponse.json({ units: units.map(serializeUnit) });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = unitPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        errors: parsedBody.error.flatten().fieldErrors,
        message: "Revise os campos da unidade.",
      },
      { status: 400 },
    );
  }

  const data = parsedBody.data;
  const unit = await prisma.unit.create({
    data: {
      active: data.active ?? true,
      city: data.city,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      defaultCategory: data.defaultCategory,
      defaultShiftHours: data.defaultShiftHours
        ? new Prisma.Decimal(data.defaultShiftHours)
        : null,
      defaultShiftValue: data.defaultShiftValue
        ? new Prisma.Decimal(data.defaultShiftValue)
        : null,
      isFixed: data.isFixed,
      name: data.name,
      notes: data.notes,
      type: data.type,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ unit: serializeUnit(unit) }, { status: 201 });
}
