import Link from "next/link";
import {
  BookOpen,
  Flame,
  Target,
  PenLine,
  CheckSquare,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  { href: "/daily", label: "Daily", icon: BookOpen, desc: "Rituais matinais e noturnos" },
  { href: "/habitos", label: "Hábitos", icon: Flame, desc: "Rastreie suas consistências" },
  { href: "/metas", label: "Metas", icon: Target, desc: "Acompanhe seu progresso" },
  { href: "/diario", label: "Diário", icon: PenLine, desc: "Espaço privado de reflexão" },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare, desc: "Lista de afazeres" },
  { href: "/perfil", label: "Perfil", icon: User, desc: "Conta e configurações" },
];

export default function MaisPage() {
  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Mais</h1>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/30 hover:bg-primary/4 transition-all h-full">
              <CardContent className="pt-4 pb-4">
                <Icon className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
