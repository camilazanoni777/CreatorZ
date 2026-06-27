"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

const EVENT_COLORS = [
  { value: "#7c3aed", label: "Violeta" },
  { value: "#10b981", label: "Verde" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#3b82f6", label: "Azul" },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function AgendaPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(selectedDate);
  const [newTime, setNewTime] = useState("09:00");
  const [newAllDay, setNewAllDay] = useState(false);
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const month = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/events?month=${month}`);
      if (!res.ok) return;
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const eventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start_date.startsWith(dateStr));
  };

  const eventsForSelected = events
    .filter((e) => e.start_date.startsWith(selectedDate))
    .sort((a, b) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return a.start_date.localeCompare(b.start_date);
    });

  const formatTime = (dateStr: string) => {
    if (!dateStr.includes("T")) return null;
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const addEvent = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const start = newAllDay ? newDate : `${newDate}T${newTime}:00`;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), start_date: start, all_day: newAllDay, color: newColor }),
      });
      const event = await res.json();
      setEvents((prev) => [...prev, event]);
      setNewTitle("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize seu tempo com intenção.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input placeholder="Ex: Reunião, Dentista..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="all-day">Dia inteiro</Label>
                <Switch id="all-day" checked={newAllDay} onCheckedChange={setNewAllDay} />
              </div>
              {!newAllDay && (
                <div className="space-y-1.5">
                  <Label>Horário</Label>
                  <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewColor(c.value)}
                      className={cn("h-7 w-7 rounded-full transition-all", newColor === c.value && "ring-2 ring-offset-2 ring-foreground scale-110")}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={addEvent} className="w-full" disabled={!newTitle.trim() || saving}>
                {saving ? "Salvando..." : "Salvar evento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <CardTitle className="text-base">{MONTHS_PT[currentMonth]} {currentYear}</CardTitle>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsForDay(day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "relative flex flex-col items-center py-1.5 rounded-lg text-sm transition-all",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "bg-primary/10 text-primary font-semibold",
                    !isSelected && !isToday && "hover:bg-muted",
                  )}
                >
                  <span className="font-medium">{day}</span>
                  {!loading && dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: isSelected ? "white" : e.color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {selectedDate === todayStr
            ? "Hoje"
            : new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </h2>

        {loading ? (
          <div className="h-20 rounded-xl bg-muted/50 animate-pulse" />
        ) : eventsForSelected.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
            </CardContent>
          </Card>
        ) : (
          eventsForSelected.map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: event.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{event.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {event.all_day ? (
                    <Badge variant="muted" className="text-[10px]">Dia inteiro</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.start_date)}
                      {event.end_date && ` — ${formatTime(event.end_date)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


