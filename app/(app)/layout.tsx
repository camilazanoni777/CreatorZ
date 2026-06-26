import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <div className="flex-1 px-4 py-6 lg:px-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
