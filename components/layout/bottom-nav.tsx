"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Heart,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: "/hoje", label: "Hoje", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/check-in", label: "Check-in", icon: Heart },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/mais", label: "Mais", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {mainItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/mais" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
