import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { UnitManagement } from "@/features/units/unit-management";
import { requireSession } from "@/lib/auth/session";
import { listUnits } from "@/server/services/units";

export const metadata: Metadata = {
  description: "Hospitais, UPAs e clínicas onde você faz plantão.",
  title: "Unidades",
};


export default async function UnidadesPage() {
  const session = await requireSession();
  const units = await listUnits(session.user.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Unidades"
        title="Locais de trabalho"
        description="Cadastre hospitais, UPAs, clínicas e unidades fixas com valores padrão para agilizar os próximos plantões."
      />

      <UnitManagement initialUnits={units} />
    </div>
  );
}
