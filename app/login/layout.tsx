import { ReactNode } from "react"
import { Inter } from "next/font/google"
import { Providers } from "../providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Login - SentientEdge",
  description: "Login to access SentientEdge platform",
}

export default function LoginLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <Providers>
      <main
        className={`${inter.className} flex min-h-screen items-center justify-center bg-black text-white`}
      >
        {children}
      </main>
    </Providers>
  )
} 