"use client";

import { useQuery } from "@tanstack/react-query";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
}

export function useSession() {
  const { data, isLoading } = useQuery<{ user: SessionUser | null }>({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      return res.json();
    },
    staleTime: 0,
  });

  return {
    user: data?.user ?? null,
    isLoaded: !isLoading,
    isSignedIn: !!data?.user,
  };
}
