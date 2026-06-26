"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MoodLevel } from "@/types";

const moodEmojis: Record<MoodLevel, string> = { 1: "😔", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

export function HojeCheckIn() {
  const [todayMood, setTodayMood] = useState<MoodLevel | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  useEffect(() => {
    fetch(`/api/check-ins?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Array<{ date: string; mood: MoodLevel }> | null) => {
        if (!data) return;
        const entry = data.find((e) => e.date === today);
        if (entry) setTodayMood(entry.mood);
      });
  }, [today, month]);

  const quickCheckIn = async (mood: MoodLevel) => {
    if (saving) return;
    setSaving(true);
    setTodayMood(mood);
    try {
      await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, mood, energy: mood }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-accent-foreground" />
          Check-in emocional
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayMood !== null ? (
          <div className="text-center py-2">
            <span className="text-4xl">{moodEmojis[todayMood]}</span>
            <p className="text-sm text-muted-foreground mt-2">Registrado hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Como você está se sentindo agora?</p>
            <div className="flex justify-between gap-1">
              {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => quickCheckIn(level)}
                  className="flex-1 text-2xl py-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`Humor ${level}`}
                >
                  {moodEmojis[level]}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
              <Link href="/check-in">Check-in completo</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
