"use client";

import Link from "next/link";

export const MobileNav = () => (
  <nav className="flex gap-3 ml-auto">
    <Link href="/missions" className="text-sm">Missions</Link>
    <Link href="/fleet" className="text-sm">Fleet</Link>
    <Link href="/tactical/map" className="text-sm">Map</Link>
  </nav>
);

export default MobileNav;


