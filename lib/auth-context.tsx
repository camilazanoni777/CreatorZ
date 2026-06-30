"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/types";

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): SessionUser | null {
  return useContext(UserContext);
}
