// Cloudflare Worker bindings — gerado via `wrangler types`, adaptado manualmente.
// O arquivo PRECISA de `declare global` pois a importação o torna um módulo TypeScript.
// Quando wrangler.toml mudar, re-execute `wrangler types` e atualize aqui.

import type {} from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    /** Banco de dados principal (Cloudflare D1 — SQLite) */
    DB: D1Database;
    /** Cache leve e rate-limiting futuro (Cloudflare KV) */
    CACHE: KVNamespace;
    /** Bucket para uploads — ativar R2 no Cloudflare Dashboard e descomentar no wrangler.toml */
    // UPLOADS: R2Bucket;
    /** Segredo para assinar sessões Better Auth */
    BETTER_AUTH_SECRET: string;
    /** URL base da aplicação */
    BETTER_AUTH_URL: string;
  }
}
