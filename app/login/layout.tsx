import { ReactNode } from "react"
import { Inter } from "next/font/google"
import { Providers } from "../providers-demo"

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
        className={`${inter.className}`}
        style={{ minHeight: '100vh', background: '#000' }}
      >
        {children}
      </main>
    </Providers>
  )
} 