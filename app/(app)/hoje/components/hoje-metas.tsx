"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/types";

export function HojeMetas() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch("/api/goals?status=active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Goal[] | null) => {
        if (data) setGoals(Array.isArray(data) ? data.slice(0, 3) : []);
      });
  }, []);

  if (goals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Metas ativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
          return (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium truncate">{goal.title}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
        <Button variant="ghost" size="sm" className="w-full text-xs mt-1" asChild>
          <Link href="/metas">Ver todas as metas</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
