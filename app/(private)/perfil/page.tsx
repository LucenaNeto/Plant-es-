import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/forms/profile-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  description: "Seus dados pessoais e profissionais.",
  title: "Perfil",
};


export default async function PerfilPage() {
  const user = await getCurrentUser();
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Perfil"
        title="Dados pessoais"
        description="Estrutura inicial para edição de foto, contato, profissão, especialização, cidade e senha."
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-100 text-xl font-semibold text-teal-800">
            {initials || "P+"}
          </div>
          <div>
            <h2 className="font-semibold">{user.name}</h2>
            <p className="text-sm text-zinc-500">{user.profession}</p>
          </div>
        </div>
      </section>

      <ProfileForm user={user} />

      <div className="lg:hidden">
        <SignOutButton />
      </div>
    </div>
  );
}
