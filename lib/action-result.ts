/**
 * Contrato único de retorno das Server Actions.
 *
 * Os docs do Next 16 recomendam modelar erro *esperado* como valor de retorno
 * (e não `throw`), reservando exceções para o que é bug de verdade. Um tipo
 * discriminado por `ok` garante que o componente cliente seja obrigado pelo
 * TypeScript a tratar os dois caminhos antes de acessar `data`.
 */

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionErrorCode =
  | "conflict"
  /**
   * A operação é válida, mas encontrou algo que merece o olho do usuário antes
   * de prosseguir — hoje, plantões com horário sobreposto. Diferente de
   * `conflict`, não é uma recusa: a UI mostra o aviso e reenvia com a
   * confirmação. Manter os dois códigos separados evita que um conflito real
   * de banco seja tratado como algo que basta confirmar.
   */
  | "confirmation_required"
  | "forbidden"
  | "not_found"
  | "unauthorized"
  | "unexpected"
  | "validation";

export type ActionSuccess<TData> = {
  data: TData;
  message?: string;
  ok: true;
};

export type ActionFailure = {
  /** Código estável para o cliente decidir o comportamento (redirect, toast). */
  code: ActionErrorCode;
  /** Erros por campo, no formato de `z.flatten().fieldErrors`. */
  errors?: FieldErrors;
  /** Mensagem já pronta para exibir ao usuário, em português. */
  message: string;
  ok: false;
  /** Id do log correlato, para o usuário reportar e nós acharmos na Vercel. */
  requestId?: string;
};

export type ActionResult<TData = undefined> =
  | ActionSuccess<TData>
  | ActionFailure;

export function actionOk<TData>(
  data: TData,
  message?: string,
): ActionSuccess<TData> {
  return { data, message, ok: true };
}

export function actionFail(
  code: ActionErrorCode,
  message: string,
  options: { errors?: FieldErrors; requestId?: string } = {},
): ActionFailure {
  return {
    code,
    errors: options.errors,
    message,
    ok: false,
    requestId: options.requestId,
  };
}

/**
 * Estado inicial para `useActionState`. Mantido como um objeto separado
 * (e não `null`) para que os formulários não precisem de optional chaining
 * em toda leitura.
 */
export const IDLE_ACTION_STATE: ActionResult<never> | null = null;
