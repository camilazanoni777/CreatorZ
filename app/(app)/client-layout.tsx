"use client";

import { UserProvider } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { SessionUser } from "@/types";

export function ClientLayout({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
          <div className="flex-1 px-4 py-6 lg:px-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
