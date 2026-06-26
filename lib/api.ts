/**
 * Utilitários para Route Handlers — respostas JSON e tratamento de erros.
 */

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function unauthorized(): Response {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
}

export function notFound(msg = "Não encontrado"): Response {
  return Response.json({ error: msg }, { status: 404 });
}

export function badRequest(msg = "Dados inválidos"): Response {
  return Response.json({ error: msg }, { status: 400 });
}

export function serverError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : "Erro interno";
  console.error("[API Error]", err);
  return Response.json({ error: msg }, { status: 500 });
}

/**
 * Parse seguro do body JSON — retorna null em caso de erro.
 */
export async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
