"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  FileStack,
  History,
  Grid3x3,
  ShieldCheck,
  Menu,
  X,
  Ruler,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drawings", label: "Drawings", icon: FileStack },
  { href: "/runs", label: "Run History", icon: History },
  { href: "/rules", label: "Rule Matrix", icon: Grid3x3 },
  { href: "/gold-standard", label: "Gold Standard", icon: ShieldCheck },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Ruler className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
          CADSentinel
        </div>
        <div className="text-[11px] text-sidebar-foreground/70">JIT Industries</div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
            <Ruler className="size-4" />
          </div>
          <span className="font-mono text-sm font-semibold text-sidebar-accent-foreground">
            CADSentinel
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 hover:bg-sidebar-accent"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Brand />
        <NavLinks />
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/60">
            Compliance engine v3.2
            <br />
            21 rules · 9 drawing types
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mr-4 rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
