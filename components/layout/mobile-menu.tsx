"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Flame,
  Heart,
  Wallet,
  Target,
  PenLine,
  CheckSquare,
  User,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allItems = [
  { href: "/hoje", label: "Hoje", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/daily", label: "Daily", icon: BookOpen },
  { href: "/habitos", label: "Hábitos", icon: Flame },
  { href: "/check-in", label: "Check-in", icon: Heart },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/diario", label: "Diário", icon: PenLine },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60] flex">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="relative ml-auto w-72 h-full bg-card flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">
              Creator<span className="text-primary">Z</span>
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {allItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
