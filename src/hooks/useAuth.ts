import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function useAuth() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const convexUser = useQuery(api.auth.getCurrentUser);
  const syncUser = useMutation(api.auth.syncUser);

  useEffect(() => {
    if (clerkLoaded && clerkUser && !convexUser) {
      console.log("Syncing user:", clerkUser.id);
      syncUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || undefined,
      }).catch(error => {
        console.error("Failed to sync user:", error);
      });
    }
  }, [clerkLoaded, clerkUser, convexUser, syncUser]);

  return {
    user: convexUser,
    clerkUser,
    isLoading: !clerkLoaded || (clerkUser && !convexUser),
    isAuthenticated: !!convexUser,
  };
}