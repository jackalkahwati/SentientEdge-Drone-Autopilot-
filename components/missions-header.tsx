import Link from "next/link"
import { BellIcon, SearchIcon, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MissionsHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">SentientEdge</span>
          </Link>
        </div>

        <div className="relative flex-1 mx-4 max-w-md">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search missions..."
            className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
          />
        </div>

        <nav className="flex flex-1 items-center justify-end space-x-1">
          <Link href="/missions" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
            Missions
          </Link>
          <Link href="/analytics" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
            Analytics
          </Link>
          <Link href="/training" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
            Training
          </Link>
          <Link href="/settings" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
            Settings
          </Link>

          <Button variant="ghost" size="icon" className="ml-2">
            <BellIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <UserIcon className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </header>
  )
}

