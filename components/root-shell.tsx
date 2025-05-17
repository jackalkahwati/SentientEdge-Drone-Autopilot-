"use client"

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

interface RootShellProps {
  children: ReactNode;
}

export default function RootShell({ children }: RootShellProps) {
  const pathname = usePathname();
  const showSidebar = !pathname.startsWith("/login");

  return (
    <div className="flex min-h-screen">
      {showSidebar && <Sidebar className="hidden md:flex md:w-64 md:flex-col" />}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
} 