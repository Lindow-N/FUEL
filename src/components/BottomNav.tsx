"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Scale, MessageCircle } from "lucide-react";

const tabs = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/poids", label: "Poids", icon: Scale },
  { href: "/coach", label: "Coach", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                active
                  ? "text-emerald-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <tab.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium tracking-wide uppercase">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
