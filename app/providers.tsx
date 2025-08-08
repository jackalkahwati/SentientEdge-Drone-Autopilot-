"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { MissionsProvider } from "@/hooks/use-missions";
import { DronesProvider } from "@/hooks/use-drones";
import { RealtimeProvider } from "@/hooks/use-realtime";
import { ApiMiddleware } from "./api-middleware";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>
        <ApiMiddleware>
          <MissionsProvider>
            <DronesProvider>
              <RealtimeProvider>
                {children}
                <Toaster />
              </RealtimeProvider>
            </DronesProvider>
          </MissionsProvider>
        </ApiMiddleware>
      </AuthProvider>
    </ThemeProvider>
  );
}
