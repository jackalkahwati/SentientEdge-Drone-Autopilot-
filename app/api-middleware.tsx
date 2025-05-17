"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

// Routes that do not require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function ApiMiddleware({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // If authentication check is complete
    if (!loading) {
      // If user is not authenticated and trying to access a protected route
      if (!isAuthenticated && !isPublicRoute && pathname !== "/login") {
        router.replace("/login");
      }
      
      // If user is authenticated and trying to access a public auth page
      if (isAuthenticated && isPublicRoute && pathname !== "/") {
        router.replace("/");
      }
    }
  }, [isAuthenticated, loading, router, pathname, isPublicRoute]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Public route or authenticated user accessing protected route
  if (isPublicRoute || isAuthenticated) {
    return <>{children}</>;
  }

  // This is just a fallback, the redirect in the useEffect should happen before this
  return null;
}