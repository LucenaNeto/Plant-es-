import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { serializeUnit } from "@/lib/units/serializer";
import { unitPayloadSchema } from "@/lib/validators/units";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const unit = await prisma.unit.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!unit) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ unit: serializeUnit(unit) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
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

  const existingUnit = await prisma.unit.findFirst({
    select: { id: true },
    where: { id, userId: session.user.id },
  });

  if (!existingUnit) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  const data = parsedBody.data;
  const unit = await prisma.unit.update({
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
    },
    where: { id },
  });

  return NextResponse.json({ unit: serializeUnit(unit) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const existingUnit = await prisma.unit.findFirst({
    select: { id: true },
    where: { id, userId: session.user.id },
  });

  if (!existingUnit) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  const unit = await prisma.unit.update({
    data: { active: false },
    where: { id },
  });

  return NextResponse.json({ unit: serializeUnit(unit) });
}
