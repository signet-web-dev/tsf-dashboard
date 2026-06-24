"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };
type NavGroup = { heading?: string; links: NavLink[] };

const NAV: NavGroup[] = [
  { links: [{ label: "Overview", href: "/dashboard" }] },
  {
    links: [
      { label: "Customers", href: "/customers" },
      { label: "Orders", href: "/orders" },
      { label: "Prospects", href: "/prospects" },
      { label: "Retention", href: "/retention" },
    ],
  },
  {
    heading: "Finance",
    links: [
      { label: "Consolidated P&L", href: "/finance" },
      { label: "SSPL · Sales & Unit Economics", href: "/finance/sspl" },
      { label: "SSPL · Expenses", href: "/finance/sspl/expenses" },
      { label: "SSPL · Cashflow", href: "/finance/sspl/cashflow" },
      { label: "TSF · Company Structure", href: "/finance/tsf" },
      { label: "TSF · Store Expenses", href: "/finance/tsf/store" },
      { label: "TSF · Inventory", href: "/finance/tsf/inventory" },
    ],
  },
  {
    links: [
      { label: "Performance", href: "/performance" },
      { label: "Marketing", href: "/marketing" },
      { label: "Targets", href: "/targets" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-2 top-2 z-50 flex h-10 w-10 items-center justify-center rounded-md border bg-white text-gray-600 md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-white transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center border-b px-4 pl-14 md:pl-4">
          <span className="font-semibold">TSF Dashboard</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group, i) => (
            <div key={i} className={cn(i > 0 && "mt-4 border-t pt-4")}>
              {group.heading && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.heading}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const active =
                    pathname === link.href ||
                    (link.href !== "/dashboard" && pathname.startsWith(link.href));
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-gray-100 font-medium text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
