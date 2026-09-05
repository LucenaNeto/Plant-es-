import { NextResponse } from "next/server";
import {
  notFoundResponse,
  validationResponse,
  withApiAuth,
} from "@/server/api-handler";
import {
  deactivateUnit,
  findUnit,
  updateUnit,
} from "@/server/services/units";
import { unitUpdateSchema } from "@/lib/validators/units";

type RouteArg = { params: Promise<{ id: string }> };

// Função, não constante: uma `Response` só pode ter o corpo lido uma vez, e
// reaproveitar a mesma instância faria o segundo 404 do processo falhar.
const unitNotFound = () => notFoundResponse("Unidade não encontrada.");

export const GET = withApiAuth<RouteArg>(
  "units.get",
  async ({ userId }, _request, { params }) => {
    const { id } = await params;
    const unit = await findUnit(userId, id);

    if (!unit) {
      return unitNotFound();
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
      return unitNotFound();
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
      return unitNotFound();
    }

    logger.info("unit.deactivated", { unitId: unit.id });

    return NextResponse.json({ unit });
  },
);
