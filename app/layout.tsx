import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreatorZ — Sua assistente pessoal de alta performance",
  description:
    "Rotina, tarefas, hábitos, check-in emocional, diário, metas, agenda e finanças em um só lugar.",
  keywords: ["produtividade", "organização", "hábitos", "metas", "finanças pessoais"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
