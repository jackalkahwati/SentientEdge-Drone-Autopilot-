"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { MissionsProvider } from "@/hooks/use-missions";
import { DronesProvider } from "@/hooks/use-drones";
import { Toaster } from "@/components/ui/toaster";
import { DemoShell } from "@/components/demo-shell";
import { ApiMiddleware } from "./api-middleware";
import { ENABLE_REALTIME } from "@/lib/config";
import { RealtimeProvider } from "@/hooks/use-realtime";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const Tree = (
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
              {ENABLE_REALTIME ? (
                <RealtimeProvider>
                  <DemoShell>
                    {children}
                  </DemoShell>
                  <Toaster />
                </RealtimeProvider>
              ) : (
                <DemoShell>
                  {children}
                  <Toaster />
                </DemoShell>
              )}
            </DronesProvider>
          </MissionsProvider>
        </ApiMiddleware>
      </AuthProvider>
    </ThemeProvider>
  );

  return Tree;
}
