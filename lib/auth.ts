/**
 * Better Auth — configuração do servidor.
 * Use createAuth(db) dentro de Route Handlers e Server Actions,
 * passando o binding D1 obtido via getCloudflareContext().
 * NUNCA importar auth.ts em componentes client-side.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@/lib/schema";

export function createAuth(db: D1Database) {
  const drizzleDb = drizzle(db, { schema });

  return betterAuth({
    database: drizzleAdapter(drizzleDb, {
      provider: "sqlite",
      schema,
    }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
