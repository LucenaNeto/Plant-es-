import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /**
       * O prefixo `_` marca um parâmetro que a assinatura exige mas o corpo
       * não usa — caso comum em Route Handlers (`_request`) e em Server
       * Actions consumidas por `useActionState`, que sempre recebem
       * `previousState` mesmo quando a action não olha para ele. Sem esta
       * regra, a alternativa seria remover o parâmetro e quebrar o contrato.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
