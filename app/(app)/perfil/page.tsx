"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User, Bell, Shield, Pencil, Crown, LogOut, Trash2,
  CheckCircle, AlertCircle, Eye, EyeOff, Save, X, Clock,
  Globe, Monitor, Sun, Moon, CalendarDays, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

// ── Tipos ──────────────────────────────────────────────────────

type Profile = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  plan: "free" | "pro";
  display_name: string | null;
  bio: string | null;
  city: string | null;
  timezone: string;
  theme_preference: "light" | "dark" | "system";
  notifications_enabled: boolean;
  daily_reminder_time: string;
  financial_values_visible: boolean;
  week_start: "monday" | "sunday";
  language: string;
  createdAt: string | number | Date;
};

type Feedback = { type: "success" | "error"; message: string } | null;

// ── Helpers ───────────────────────────────────────────────────

function formatJoinDate(createdAt: string | number | Date): string {
  try {
    const d =
      typeof createdAt === "number"
        ? new Date(createdAt * 1000)
        : new Date(createdAt);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Componente de feedback inline ────────────────────────────

function FeedbackBanner({ feedback, onDismiss }: { feedback: Feedback; onDismiss: () => void }) {
  if (!feedback) return null;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
        feedback.type === "success"
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
          : "bg-destructive/5 border border-destructive/20 text-destructive"
      }`}
    >
      {feedback.type === "success" ? (
        <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{feedback.message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Skeleton de carregamento ──────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Formulário de dados pessoais
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    name: "",
    display_name: "",
    bio: "",
    city: "",
    timezone: "America/Sao_Paulo",
  });

  // Preferências
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    theme_preference: "system" as "light" | "dark" | "system",
    notifications_enabled: true,
    daily_reminder_time: "08:00",
    financial_values_visible: true,
    week_start: "monday" as "monday" | "sunday",
    language: "pt-BR",
  });

  // Modal de senha
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<Feedback>(null);

  // Modal de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Carregar perfil ─────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) return;
      const data = (await res.json()) as Profile;
      setProfile(data);
      setPersonalForm({
        name:         data.name,
        display_name: data.display_name ?? "",
        bio:          data.bio ?? "",
        city:         data.city ?? "",
        timezone:     data.timezone,
      });
      setPrefs({
        theme_preference:         data.theme_preference,
        notifications_enabled:    data.notifications_enabled,
        daily_reminder_time:      data.daily_reminder_time,
        financial_values_visible: data.financial_values_visible,
        week_start:               data.week_start,
        language:                 data.language,
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Salvar dados pessoais ───────────────────────────────────

  async function savePersonal() {
    if (!profile) return;
    setSavingPersonal(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         personalForm.name.trim() || undefined,
          display_name: personalForm.display_name.trim() || undefined,
          bio:          personalForm.bio.trim() || undefined,
          city:         personalForm.city.trim() || undefined,
          timezone:     personalForm.timezone || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setFeedback({ type: "error", message: err.error ?? "Erro ao salvar perfil." });
        return;
      }
      setProfile((p) => p ? { ...p, ...personalForm, display_name: personalForm.display_name || null, bio: personalForm.bio || null, city: personalForm.city || null } : p);
      setIsEditingPersonal(false);
      setFeedback({ type: "success", message: "Perfil atualizado com sucesso!" });
    } finally {
      setSavingPersonal(false);
    }
  }

  // ── Salvar preferências ─────────────────────────────────────

  async function savePrefs(update: Partial<typeof prefs>) {
    const next = { ...prefs, ...update };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  // ── Alterar senha ───────────────────────────────────────────

  async function changePassword() {
    if (!pwdForm.next || pwdForm.next !== pwdForm.confirm) {
      setPwdFeedback({ type: "error", message: "As senhas não coincidem." });
      return;
    }
    if (pwdForm.next.length < 8) {
      setPwdFeedback({ type: "error", message: "A nova senha deve ter no mínimo 8 caracteres." });
      return;
    }
    setSavingPwd(true);
    setPwdFeedback(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setPwdFeedback({ type: "error", message: err.error ?? "Erro ao alterar senha." });
        return;
      }
      setPwdFeedback({ type: "success", message: "Senha alterada com sucesso!" });
      setPwdForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdOpen(false), 1500);
    } finally {
      setSavingPwd(false);
    }
  }

  // ── Logout ──────────────────────────────────────────────────

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  // ── Excluir conta ───────────────────────────────────────────

  async function deleteAccount() {
    if (deleteConfirm !== "DELETAR") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETAR" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setFeedback({ type: "error", message: err.error ?? "Erro ao excluir conta." });
        setDeleteOpen(false);
        return;
      }
      await authClient.signOut();
      router.replace("/login");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  if (loading) return <ProfileSkeleton />;
  if (!profile) return null;

  const displayName = profile.display_name || profile.name;
  const initials = getInitials(profile.name);
  const joinDate = formatJoinDate(profile.createdAt);

  const timezones = [
    "America/Sao_Paulo", "America/Manaus", "America/Belem",
    "America/Fortaleza", "America/Recife", "America/Bahia",
    "America/Noronha", "America/Porto_Velho", "America/Boa_Vista",
    "America/Campo_Grande", "America/Cuiaba",
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/Lisbon", "Europe/London", "Europe/Paris", "Europe/Berlin",
    "UTC",
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* ── Feedback global ── */}
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* ── Header: avatar + nome + email ── */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
        <CardContent className="pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                  {profile.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.image} alt={profile.name} className="h-20 w-20 object-cover rounded-full" />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-primary/15 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  title="Alterar foto — em breve"
                  disabled
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow opacity-50 cursor-not-allowed"
                >
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-foreground leading-tight">{displayName}</h1>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant={profile.plan === "pro" ? "default" : "secondary"}>
                    {profile.plan === "pro" ? "✨ Pro" : "Free"}
                  </Badge>
                  {joinDate && (
                    <span className="text-xs text-muted-foreground">Membro desde {joinDate}</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingPersonal((v) => !v)}
              className="shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isEditingPersonal ? "Cancelar" : "Editar perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Dados pessoais ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingPersonal ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={personalForm.name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Nome de exibição</Label>
                  <Input
                    id="display_name"
                    value={personalForm.display_name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, display_name: e.target.value }))}
                    placeholder="Como prefere ser chamada"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Biografia curta</Label>
                <Textarea
                  id="bio"
                  value={personalForm.bio}
                  onChange={(e) => setPersonalForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Conte um pouco sobre você..."
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {personalForm.bio.length}/500
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="flex items-center gap-1">
                    Cidade
                    <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="city"
                    value={personalForm.city}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="São Paulo, SP"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Fuso horário
                  </Label>
                  <select
                    id="timezone"
                    value={personalForm.timezone}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, timezone: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={savePersonal} disabled={savingPersonal} size="sm">
                  {savingPersonal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingPersonal(false);
                    setPersonalForm({
                      name:         profile.name,
                      display_name: profile.display_name ?? "",
                      bio:          profile.bio ?? "",
                      city:         profile.city ?? "",
                      timezone:     profile.timezone,
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <Row label="Nome" value={profile.name} />
              {profile.display_name && <Row label="Nome de exibição" value={profile.display_name} />}
              {profile.bio && <Row label="Biografia" value={profile.bio} />}
              {profile.city && <Row label="Cidade" value={profile.city} />}
              <Row label="Fuso horário" value={profile.timezone} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Preferências do app ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Preferências do app
            {savingPrefs && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tema */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tema</Label>
            <div className="flex gap-2">
              {([
                { value: "light", label: "Claro", icon: Sun },
                { value: "dark",  label: "Escuro", icon: Moon },
                { value: "system",label: "Automático", icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => savePrefs({ theme_preference: value })}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    prefs.theme_preference === value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Notificações */}
          <PrefSwitch
            id="notif"
            label="Notificações"
            description="Receber lembretes e resumos"
            checked={prefs.notifications_enabled}
            onCheckedChange={(v) => savePrefs({ notifications_enabled: v })}
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          />

          {/* Horário diário */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Horário do Daily</p>
                <p className="text-xs text-muted-foreground">Lembrete preferido para o check-in</p>
              </div>
            </div>
            <input
              type="time"
              value={prefs.daily_reminder_time}
              onChange={(e) => savePrefs({ daily_reminder_time: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-28 text-right"
            />
          </div>

          <Separator />

          {/* Valores financeiros */}
          <PrefSwitch
            id="finvalues"
            label="Mostrar valores financeiros"
            description="Exibe valores no Dashboard"
            checked={prefs.financial_values_visible}
            onCheckedChange={(v) => savePrefs({ financial_values_visible: v })}
            icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          />

          {/* Início da semana */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Início da semana</p>
                <p className="text-xs text-muted-foreground">Primeiro dia da semana no calendário</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(["monday", "sunday"] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => savePrefs({ week_start: day })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    prefs.week_start === day
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {day === "monday" ? "Seg" : "Dom"}
                </button>
              ))}
            </div>
          </div>

          {/* Idioma */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Idioma</p>
                <p className="text-xs text-muted-foreground">Preparado para futuras traduções</p>
              </div>
            </div>
            <Badge variant="secondary">🇧🇷 Português</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Plano Pro (upsell) ── */}
      {profile.plan === "free" && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/4 to-accent/4">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Upgrade para Pro</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Desbloqueie relatórios avançados, análise de padrões de comportamento e
                  integrações futuras.
                </p>
                <Button size="sm" className="mt-3" disabled>
                  Em breve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Segurança ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Conta e segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          <ActionRow
            icon={<Shield className="h-4 w-4" />}
            label="Alterar senha"
            description="Atualize sua senha de acesso"
            onClick={() => setPwdOpen(true)}
          />
          <ActionRow
            icon={<LogOut className="h-4 w-4" />}
            label="Encerrar sessão"
            description="Sair da conta neste dispositivo"
            onClick={handleSignOut}
          />
          <ActionRow
            icon={<Trash2 className="h-4 w-4 text-destructive" />}
            label="Excluir conta"
            description="Remove permanentemente todos os seus dados"
            labelClass="text-destructive"
            onClick={() => setDeleteOpen(true)}
          />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-2">
        CreatorZ · Feito com carinho para você crescer ✨
      </p>

      {/* ── Modal: alterar senha ── */}
      <Dialog open={pwdOpen} onOpenChange={(v) => { setPwdOpen(v); if (!v) { setPwdFeedback(null); setPwdForm({ current: "", next: "", confirm: "" }); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              A nova senha deve ter no mínimo 8 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {pwdFeedback && (
              <FeedbackBanner feedback={pwdFeedback} onDismiss={() => setPwdFeedback(null)} />
            )}
            <PasswordField
              id="current"
              label="Senha atual"
              value={pwdForm.current}
              onChange={(v) => setPwdForm((f) => ({ ...f, current: v }))}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((s) => !s)}
            />
            <PasswordField
              id="new"
              label="Nova senha"
              value={pwdForm.next}
              onChange={(v) => setPwdForm((f) => ({ ...f, next: v }))}
              show={showNew}
              onToggleShow={() => setShowNew((s) => !s)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button
              className="w-full"
              onClick={changePassword}
              disabled={savingPwd || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}
            >
              {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Alterar senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: excluir conta ── */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteConfirm(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir conta</DialogTitle>
            <DialogDescription>
              Essa ação é <strong>irreversível</strong>. Todos os seus dados — metas, hábitos,
              diário, finanças e tarefas — serão apagados permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive">
              Para confirmar, digite <strong>DELETAR</strong> abaixo:
            </div>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETAR"
              className="font-mono"
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleteConfirm !== "DELETAR" || deleting}
              onClick={deleteAccount}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir permanentemente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function PrefSwitch({
  id, label, description, checked, onCheckedChange, icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ActionRow({
  icon, label, description, onClick, labelClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  labelClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-6 py-3.5 hover:bg-muted/40 transition-colors text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className={`text-sm font-medium ${labelClass}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function PasswordField({
  id, label, value, onChange, show, onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "current" ? "current-password" : "new-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
