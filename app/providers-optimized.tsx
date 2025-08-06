"use client";

import { ReactNode, memo } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { MissionsProvider } from "@/hooks/use-missions";
import { DronesProvider } from "@/hooks/use-drones";
import { RealtimeProvider } from "@/hooks/use-realtime-optimized";
import { ApiMiddleware } from "./api-middleware";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
}

// Split providers into logical groups to reduce re-render scope

// Static providers (rarely change)
const StaticProviders = memo(({ children }: { children: ReactNode }) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
  >
    <AuthProvider>
      <ApiMiddleware>
        {children}
      </ApiMiddleware>
    </AuthProvider>
  </ThemeProvider>
));

StaticProviders.displayName = 'StaticProviders';

// Data providers (change more frequently)
const DataProviders = memo(({ children }: { children: ReactNode }) => (
  <MissionsProvider>
    <DronesProvider>
      {children}
    </DronesProvider>
  </MissionsProvider>
));

DataProviders.displayName = 'DataProviders';

// Real-time provider (changes most frequently, isolated)
const RealtimeProviders = memo(({ children }: { children: ReactNode }) => (
  <RealtimeProvider>
    {children}
  </RealtimeProvider>
));

RealtimeProviders.displayName = 'RealtimeProviders';

// Optimized provider composition
export function Providers({ children }: ProvidersProps) {
  return (
    <StaticProviders>
      <DataProviders>
        <RealtimeProviders>
          {children}
          <Toaster />
        </RealtimeProviders>
      </DataProviders>
    </StaticProviders>
  );
}