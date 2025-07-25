import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: user ?? null,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
