import { NextResponse } from "next/server";
import { withApiAuth, validationResponse } from "@/server/api-handler";
import { createUnit, listUnits } from "@/server/services/units";
import { unitPayloadSchema } from "@/lib/validators/units";

export const GET = withApiAuth("units.list", async ({ userId }) => {
  const units = await listUnits(userId);

  return NextResponse.json({ units });
});

export const POST = withApiAuth("units.create", async ({ logger, userId }, request) => {
  const body = await request.json().catch(() => null);
  const parsedBody = unitPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    return validationResponse(
      parsedBody.error.flatten().fieldErrors,
      "Revise os campos da unidade.",
    );
  }

  const unit = await createUnit(userId, parsedBody.data);

  logger.info("unit.created", { unitId: unit.id });

  return NextResponse.json({ unit }, { status: 201 });
});
