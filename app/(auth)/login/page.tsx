import { AuthForm } from "../auth-form";

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  // Aceita apenas rotas internas (começa com /) para evitar open redirect
  const redirectTo = next && next.startsWith("/") ? next : "/hoje";
  return <AuthForm mode="login" redirectTo={redirectTo} />;
}
