"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Escreve filtros na query string preservando os demais parâmetros.
 *
 * Filtro mora na URL, não em estado local: o botão voltar do navegador
 * funciona, o link é compartilhável, e a página continua sendo um Server
 * Component filtrando no banco em vez de no cliente.
 *
 * `isPending` vem de `useTransition` para que a lista possa esmaecer durante a
 * navegação, em vez de parecer travada.
 */
export function useFilterParams(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const query = params.toString();

      startTransition(() => {
        router.push(query ? `${basePath}?${query}` : basePath);
      });
    },
    [basePath, router, searchParams],
  );

  return { applyParams, isPending };
}
