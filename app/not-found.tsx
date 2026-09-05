import Link from "next/link";
import { DEFAULT_PRIVATE_REDIRECT } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-sm font-semibold text-teal-700">Plantões+</p>
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm leading-6 text-zinc-500">
        O endereço que você abriu não existe ou foi movido.
      </p>
      <Link
        className="mt-2 flex min-h-12 items-center rounded-md bg-zinc-950 px-6 font-semibold text-white"
        href={DEFAULT_PRIVATE_REDIRECT}
      >
        Voltar ao início
      </Link>
    </main>
  );
}
