/**
 * Better Auth — client-side.
 * Pode ser importado em componentes "use client".
 * Nunca acessa o banco diretamente — apenas faz chamadas HTTP para /api/auth.
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // URL base da API de autenticação
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
