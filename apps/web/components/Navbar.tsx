"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [{ href: "/", label: "Home" }];

function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <nav
        aria-label="Main"
        className="flex items-center gap-2 rounded-full border bg-background/70 p-1.5 pl-4 text-foreground shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full pr-2 font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Music className="size-3.5" />
          </span>
          Songdrop
        </Link>

        <span aria-hidden className="h-5 w-px bg-border" />

        <ul className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Button
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-full",
                    !active && "text-muted-foreground",
                  )}
                >
                  <Link href={href} aria-current={active ? "page" : undefined}>
                    {label}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
