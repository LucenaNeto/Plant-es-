import { PageHeader } from "@/components/ui/page-header";
import { UnitManagement } from "@/features/units/unit-management";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { serializeUnit } from "@/lib/units/serializer";

export default async function UnidadesPage() {
  const session = await requireSession();
  const units = await prisma.unit.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Unidades"
        title="Locais de trabalho"
        description="Cadastre hospitais, UPAs, clínicas e unidades fixas com valores padrão para agilizar os próximos plantões."
      />

      <UnitManagement initialUnits={units.map(serializeUnit)} />
    </div>
  );
}
