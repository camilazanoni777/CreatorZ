"use client";

import { useState, useEffect } from "react";
import { Heart, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MoodLevel } from "@/types";

const moods: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: "😔", label: "Péssimo" },
  { level: 2, emoji: "😕", label: "Ruim" },
  { level: 3, emoji: "😐", label: "Ok" },
  { level: 4, emoji: "🙂", label: "Bem" },
  { level: 5, emoji: "😄", label: "Ótimo" },
];

const energies: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: "🪫", label: "Esgotada" },
  { level: 2, emoji: "😴", label: "Cansada" },
  { level: 3, emoji: "😌", label: "Estável" },
  { level: 4, emoji: "⚡", label: "Disposta" },
  { level: 5, emoji: "🚀", label: "Com tudo" },
];

const prompts = [
  "O que está pesando agora?",
  "Tem algo que você está evitando? Por quê?",
  "Qual é a melhor coisa que aconteceu hoje?",
  "O que você precisa amanhã que hoje faltou?",
  "Como você pode ser gentil consigo mesma hoje?",
];

export default function CheckInPage() {
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [energy, setEnergy] = useState<MoodLevel | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promptIdx] = useState(() => Math.floor(Math.random() * prompts.length));

  const today = new Date().toISOString().slice(0, 10);

  // Carrega check-in existente de hoje, se houver
  useEffect(() => {
    const month = today.slice(0, 7);
    fetch(`/api/check-ins?month=${month}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: Array<{ date: string; mood: MoodLevel; energy: MoodLevel; note?: string }> | null) => {
        if (!data) return;
        const todayEntry = data.find((e) => e.date === today);
        if (todayEntry) {
          setMood(todayEntry.mood);
          setEnergy(todayEntry.energy);
          setNote(todayEntry.note ?? "");
        }
      });
  }, [today]);

  const canSave = mood !== null && energy !== null;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, mood, energy, note: note || undefined }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-xl font-semibold">Check-in registrado!</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Cada vez que você para para se perguntar como está, você já está cuidando de si mesma.
        </p>
        <Button onClick={() => setSaved(false)} variant="outline">
          Fazer novo check-in
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in emocional</h1>
        <p className="text-muted-foreground mt-1 text-sm">Um momento só seu. Sem julgamento.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-accent-foreground" />
            Como você está se sentindo?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {moods.map(({ level, emoji, label }) => (
              <button
                key={level}
                onClick={() => setMood(level)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  mood === level ? "border-primary bg-primary/8 scale-105" : "border-border hover:border-primary/40 hover:bg-muted",
                )}
                aria-label={label}
                aria-pressed={mood === level}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground leading-none">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-warning-foreground" />
            Qual é o seu nível de energia?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {energies.map(({ level, emoji, label }) => (
              <button
                key={level}
                onClick={() => setEnergy(level)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  energy === level ? "border-warning bg-warning/10 scale-105" : "border-border hover:border-warning/40 hover:bg-muted",
                )}
                aria-label={label}
                aria-pressed={energy === level}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground leading-none">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💬 {prompts[promptIdx]}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escreva aqui, com calma. Só você vai ver."
            className="min-h-[120px] resize-none text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Nota de reflexão"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Dados emocionais são privados e nunca compartilhados.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={!canSave || saving} size="lg" className="w-full">
        {saving ? "Registrando..." : "Registrar check-in"}
      </Button>
    </div>
  );
}


