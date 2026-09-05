import { NextResponse } from "next/server";
import { withApiAuth, validationResponse } from "@/server/api-handler";
import {
  deactivateUnit,
  findUnit,
  updateUnit,
} from "@/server/services/units";
import { unitUpdateSchema } from "@/lib/validators/units";

type RouteArg = { params: Promise<{ id: string }> };

const NOT_FOUND = NextResponse.json(
  { message: "Unidade não encontrada." },
  { status: 404 },
);

export const GET = withApiAuth<RouteArg>(
  "units.get",
  async ({ userId }, _request, { params }) => {
    const { id } = await params;
    const unit = await findUnit(userId, id);

    if (!unit) {
      return NOT_FOUND;
    }

    return NextResponse.json({ unit });
  },
);

export const PATCH = withApiAuth<RouteArg>(
  "units.update",
  async ({ logger, userId }, request, { params }) => {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsedBody = unitUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return validationResponse(
        parsedBody.error.flatten().fieldErrors,
        "Revise os campos da unidade.",
      );
    }

    const unit = await updateUnit(userId, id, parsedBody.data);

    if (!unit) {
      return NOT_FOUND;
    }

    logger.info("unit.updated", {
      fields: Object.keys(parsedBody.data),
      unitId: unit.id,
    });

    return NextResponse.json({ unit });
  },
);

export const DELETE = withApiAuth<RouteArg>(
  "units.deactivate",
  async ({ logger, userId }, _request, { params }) => {
    const { id } = await params;
    const unit = await deactivateUnit(userId, id);

    if (!unit) {
      return NOT_FOUND;
    }

    logger.info("unit.deactivated", { unitId: unit.id });

    return NextResponse.json({ unit });
  },
);
