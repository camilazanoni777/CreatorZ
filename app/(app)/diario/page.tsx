"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DiaryEntry, MoodLevel } from "@/types";

const moodEmojis: Record<MoodLevel, string> = {
  1: "😔", 2: "😕", 3: "😐", 4: "🙂", 5: "😄",
};

const prompts = [
  "O que você não consegue parar de pensar hoje?",
  "Qual foi o momento mais significativo da semana?",
  "O que você aprendeu sobre si mesma recentemente?",
  "O que você faria diferente se pudesse voltar atrás?",
  "Descreva como você quer se sentir amanhã.",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export default function DiarioPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [content, setContent] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [promptIdx] = useState(() => Math.floor(Math.random() * prompts.length));

  const month = new Date().toISOString().slice(0, 7);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/diary?month=${month}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [month, router]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const saveEntry = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, content: content.trim(), tags: [] }),
      });
      const entry = await res.json();
      setEntries((prev) => [{ ...entry, tags: entry.tags ?? [] }, ...prev]);
      setContent("");
      setIsWriting(false);
    } finally {
      setSaving(false);
    }
  };

  if (selectedEntry) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>← Voltar</Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="muted" className="capitalize">{formatDateLabel(selectedEntry.date)}</Badge>
            {selectedEntry.mood && <span className="text-lg">{moodEmojis[selectedEntry.mood as MoodLevel]}</span>}
            {selectedEntry.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
            ))}
          </div>
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Esta entrada é privada e só você pode ver.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diário</h1>
          <p className="text-muted-foreground text-sm mt-1">Um espaço só seu. Privado, honesto e sem julgamento.</p>
        </div>
        {!isWriting && (
          <Button size="sm" onClick={() => setIsWriting(true)}>
            <Plus className="h-4 w-4" />
            Escrever
          </Button>
        )}
      </div>

      {isWriting && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              Nova entrada — hoje
            </CardTitle>
            <p className="text-sm text-muted-foreground italic">{prompts[promptIdx]}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Escreva livremente. Sem regras."
              className="min-h-[180px] resize-none text-sm border-0 bg-muted/30 focus-visible:ring-0 focus-visible:bg-muted/50 transition-colors"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button onClick={saveEntry} disabled={!content.trim() || saving}>
                {saving ? "Salvando..." : "Salvar entrada"}
              </Button>
              <Button variant="ghost" onClick={() => { setIsWriting(false); setContent(""); }}>
                Cancelar
              </Button>
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Privado
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Entradas anteriores
        </h2>
        {entries.map((entry) => (
          <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left">
            <Card className="hover:border-primary/30 transition-all">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {formatDateLabel(entry.date)}
                      </span>
                      {entry.mood && <span className="text-base">{moodEmojis[entry.mood as MoodLevel]}</span>}
                      {entry.tags?.map((tag) => (
                        <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                    <p className={cn("text-sm text-foreground/80 leading-relaxed line-clamp-2")}>
                      {entry.content}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}

        {entries.length === 0 && !isWriting && (
          <Card>
            <CardContent className="py-12 text-center">
              <PenLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Nenhuma entrada ainda. O diário espera por você.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
