"use client";

import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Shield,
  ChevronRight,
  Crown,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro";
  createdAt: string | number;
};

function formatJoinDate(createdAt: string | number): string {
  try {
    const d = typeof createdAt === "number" ? new Date(createdAt * 1000) : new Date(createdAt);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState({
    habitos: true,
    checkIn: true,
    metas: false,
    weekly: true,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setProfile(data as Profile); });
  }, []);

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Avatar / Nome */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl bg-primary/15 text-primary font-semibold">
                  {profile.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow"
                aria-label="Editar foto"
              >
                <Pencil className="h-3 w-3 text-white" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={profile.plan === "pro" ? "default" : "muted"}>
                  {profile.plan === "pro" ? "✨ Pro" : "Free"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  desde {formatJoinDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plano Pro */}
      {profile.plan === "free" && (
        <Card className="border-primary/20 bg-primary/4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Upgrade para Pro</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desbloqueie relatórios avançados, análise de padrões e muito mais.
                </p>
                <Button size="sm" className="mt-3" disabled>
                  Em breve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notificações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "habitos" as const, label: "Lembrete de hábitos", desc: "Diariamente às 8h" },
            { id: "checkIn" as const, label: "Check-in emocional", desc: "Diariamente às 20h" },
            { id: "metas" as const, label: "Atualização de metas", desc: "Semanalmente" },
            { id: "weekly" as const, label: "Resumo semanal", desc: "Todo domingo" },
          ].map(({ id, label, desc }) => (
            <div key={id} className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor={`notif-${id}`} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                id={`notif-${id}`}
                checked={notifications[id]}
                onCheckedChange={(v) =>
                  setNotifications((prev) => ({ ...prev, [id]: v }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {[
            { label: "Editar perfil", icon: Pencil },
            { label: "Privacidade", icon: Shield },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex items-center justify-between w-full px-6 py-3.5 hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-2">
        CreatorZ v0.1.0 · Feito com ✨ para você crescer
      </p>
    </div>
  );
}
