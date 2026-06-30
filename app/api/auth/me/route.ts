/**
 * GET /api/auth/me — retorna os dados do usuário autenticado.
 * Usado por componentes client-side que precisam do usuário atual.
 */
import { getSession } from "@/lib/session";
import { json, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    return json({
      id:        session.user.id,
      name:      session.user.name,
      email:     session.user.email,
      image:     session.user.image ?? null,
      createdAt: session.user.createdAt,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
