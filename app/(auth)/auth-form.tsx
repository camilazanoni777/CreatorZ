"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const result = isSignup
      ? await authClient.signUp.email({
          name: name.trim() || email.trim(),
          email: email.trim(),
          password,
        })
      : await authClient.signIn.email({
          email: email.trim(),
          password,
        });

    setLoading(false);

    if (result.error) {
      setError(result.error.message || "Nao foi possivel entrar agora.");
      return;
    }

    router.replace("/hoje");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#fff_0%,#f8fafc_45%,#f6f1ed_100%)] px-4 py-10">
      <section className="w-full max-w-md rounded-[24px] border border-zinc-200 bg-white/90 p-6 shadow-[0_24px_70px_rgba(82,66,96,0.12)]">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Creator<span className="text-primary">Z</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "Crie sua conta para salvar seu painel." : "Entre para carregar seu painel."}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo de 8 caracteres"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full rounded-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSignup ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? "Ja tem conta?" : "Ainda nao tem conta?"}{" "}
          <Link className="font-medium text-primary hover:underline" href={isSignup ? "/login" : "/cadastro"}>
            {isSignup ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </section>
    </main>
  );
}
