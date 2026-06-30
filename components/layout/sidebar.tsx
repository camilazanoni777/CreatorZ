"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/auth-context";
import { authClient } from "@/lib/auth-client";

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
  const router = useRouter();
  const user = useUser();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

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
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé com usuário */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {user && (
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
