"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, CheckSquare2, Coffee, Sunrise, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type DailyItem = { id: string; label: string; done: boolean };

const DEFAULT_MORNING: DailyItem[] = [
  { id: "agua", label: "Beber água ao acordar", done: false },
  { id: "meditacao", label: "Meditar por 5 minutos", done: false },
  { id: "intencao", label: "Definir intenção do dia", done: false },
  { id: "prioridade", label: "Escolher 3 prioridades", done: false },
];

const DEFAULT_EVENING: DailyItem[] = [
  { id: "vitoria", label: "Anotar 1 vitória do dia", done: false },
  { id: "gratidao", label: "Escrever 3 gratidões", done: false },
  { id: "amanha", label: "Preparar o amanhã", done: false },
  { id: "tela", label: "Sem tela 30 min antes de dormir", done: false },
];

type DailyEntry = {
  morning_checklist?: Record<string, boolean>;
  evening_checklist?: Record<string, boolean>;
  intention?: string;
  gratitude?: string;
};

export default function DailyPage() {
  const [morning, setMorning] = useState(DEFAULT_MORNING);
  const [evening, setEvening] = useState(DEFAULT_EVENING);
  const [intencao, setIntencao] = useState("");
  const [gratidao, setGratidao] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const loadDaily = useCallback(async () => {
    const res = await fetch(`/api/daily?date=${today}`);
    if (!res.ok) return;
    const data: DailyEntry | null = await res.json();
    if (!data) return;
    if (data.morning_checklist) {
      setMorning(DEFAULT_MORNING.map((i) => ({ ...i, done: data.morning_checklist![i.id] ?? false })));
    }
    if (data.evening_checklist) {
      setEvening(DEFAULT_EVENING.map((i) => ({ ...i, done: data.evening_checklist![i.id] ?? false })));
    }
    if (data.intention) setIntencao(data.intention);
    if (data.gratitude) setGratidao(data.gratitude);
  }, [today]);

  useEffect(() => { loadDaily(); }, [loadDaily]);

  const toggle = (
    list: DailyItem[],
    setList: (l: DailyItem[]) => void,
    id: string,
  ) => { setList(list.map((i) => (i.id === id ? { ...i, done: !i.done } : i))); };

  const allItems = [...morning, ...evening];
  const doneCount = allItems.filter((i) => i.done).length;
  const pct = Math.round((doneCount / allItems.length) * 100);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const morning_checklist = Object.fromEntries(morning.map((i) => [i.id, i.done]));
      const evening_checklist = Object.fromEntries(evening.map((i) => [i.id, i.done]));
      await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, morning_checklist, evening_checklist, intention: intencao || undefined, gratitude: gratidao || undefined }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily</h1>
        <p className="text-muted-foreground text-sm mt-1">Sua rotina estruturada para começar e terminar bem.</p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <CheckSquare2 className="h-4 w-4 text-primary" />
              Progresso do dia
            </span>
            <span className="text-muted-foreground">{doneCount}/{allItems.length}</span>
          </div>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sunrise className="h-4 w-4 text-warning-foreground" />
            Ritual matinal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {morning.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox id={item.id} checked={item.done} onCheckedChange={() => toggle(morning, setMorning, item.id)} />
              <Label htmlFor={item.id} className={`text-sm cursor-pointer ${item.done ? "line-through text-muted-foreground" : ""}`}>
                {item.label}
              </Label>
            </div>
          ))}
          <div className="space-y-1.5 pt-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
              Intenção do dia
            </Label>
            <Textarea
              placeholder="O que mais importa hoje?"
              className="min-h-[70px] resize-none text-sm"
              value={intencao}
              onChange={(e) => setIntencao(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-primary" />
            Ritual noturno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evening.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox id={item.id} checked={item.done} onCheckedChange={() => toggle(evening, setEvening, item.id)} />
              <Label htmlFor={item.id} className={`text-sm cursor-pointer ${item.done ? "line-through text-muted-foreground" : ""}`}>
                {item.label}
              </Label>
            </div>
          ))}
          <div className="space-y-1.5 pt-2">
            <Label className="text-sm font-medium">3 gratidões de hoje</Label>
            <Textarea
              placeholder="1. Fui grata por...&#10;2. Me alegrou...&#10;3. Aprendi..."
              className="min-h-[80px] resize-none text-sm"
              value={gratidao}
              onChange={(e) => setGratidao(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {saved ? (
        <div className="text-center py-3 text-sm text-success font-medium">
          ✅ Daily salva! Bom trabalho.
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <BookOpen className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar daily"}
        </Button>
      )}
    </div>
  );
}


