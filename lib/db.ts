/**
 * Helper para acessar o binding D1 do Cloudflare.
 * Só pode ser chamado dentro de Route Handlers, Server Actions ou Server Components.
 * NUNCA importar em componentes client-side.
 */
import type { D1Result } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * Gera um ID único compatível com D1 (nanoid-like sem dependência extra).
 */
export function generateId(length = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Wrapper de prepared statement com bind tipado.
 * Garante que os parâmetros são sempre passados de forma segura.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null | undefined)[]
): Promise<T[]> {
  const db = await getDB();
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<T>();
  return result.results;
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null | undefined)[]
): Promise<T | null> {
  const db = await getDB();
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).first<T>();
  return result ?? null;
}

export async function execute(
  sql: string,
  ...params: (string | number | null | undefined)[]
): Promise<D1Result> {
  const db = await getDB();
  const stmt = db.prepare(sql);
  return stmt.bind(...params).run();
}
