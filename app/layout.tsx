import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Providers } from "./providers-optimized"
import RootShell from "@/components/root-shell"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "SentientEdge - AutonoFly AI Autopilot & Battle Management Platform",
  description: "Advanced AI-powered autonomous drone autopilot and battle management platform",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <Providers>
          <RootShell>{children}</RootShell>
        </Providers>
      </body>
    </html>
  )
}
