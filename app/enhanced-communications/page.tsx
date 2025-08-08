import { EnhancedCommunicationProvider } from "@/hooks/use-enhanced-communication"
import EnhancedCommunicationDashboard from "@/components/enhanced-communication-dashboard"
import { MobileNav } from "@/components/mobile-nav"
import Link from "next/link"

export default function EnhancedCommunicationsPage() {
  return (
    <EnhancedCommunicationProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-xl">SentientEdge</span>
              </Link>
            </div>
            <MobileNav />
          </div>
        </header>

        <div className="border-b">
          <div className="flex h-16 items-center px-4 md:px-6">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold md:text-2xl">Enhanced Communications</h1>
            </div>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6">
          <EnhancedCommunicationDashboard />
        </main>
      </div>
    </EnhancedCommunicationProvider>
  )
}