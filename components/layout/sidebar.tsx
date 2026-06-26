"use client";

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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          Creator<span className="text-primary">Z</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-thin">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent/50 p-3 text-xs text-sidebar-accent-foreground">
          <p className="font-semibold mb-0.5">Plano Free</p>
          <p className="text-muted-foreground">Upgrade para Pro em breve</p>
        </div>
      </div>
    </aside>
  );
}
