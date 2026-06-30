import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ClientLayout } from "./client-layout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ClientLayout user={session.user}>{children}</ClientLayout>;
}
