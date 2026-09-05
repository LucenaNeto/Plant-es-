"use client";

/**
 * Último recurso: erro no próprio root layout. Substitui `<html>`/`<body>`,
 * então precisa declará-los e não pode depender de nada da aplicação —
 * inclusive do CSS global, que pode ser justamente o que falhou. Por isso os
 * estilos aqui são inline.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          alignItems: "center",
          backgroundColor: "#fafaf9",
          color: "#18181b",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "1.25rem",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            O aplicativo não conseguiu iniciar
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Recarregue a página. Se continuar, informe o código abaixo.
          </p>
          <button
            onClick={() => retry()}
            style={{
              backgroundColor: "#09090b",
              border: "none",
              borderRadius: "0.375rem",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
              minHeight: "3rem",
              padding: "0 1.5rem",
            }}
            type="button"
          >
            Tentar novamente
          </button>
          {error.digest ? (
            <p style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>
              Código: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
