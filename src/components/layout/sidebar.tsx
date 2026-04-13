"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Sparkles, Search, Settings, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveSessions } from "@/hooks/use-api";
import { useModifierLabel } from "@/hooks/use-platform";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/prompts", label: "Prompts", icon: Bookmark },
  { href: "/tasks", label: "Insights", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: activeSessions } = useActiveSessions();
  const activeCount = activeSessions?.length ?? 0;
  const modLabel = useModifierLabel();

  return (
    <aside className="w-[220px] bg-[#1c1c1e]/80 backdrop-blur-xl flex flex-col h-full border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-[17px] font-bold text-white tracking-tight leading-tight">Claudeboard</h1>
        <p className="text-[10px] text-[#8e8e93] mt-0.5 tracking-wide">Designed for Claude Code Projects</p>
      </div>

      <nav className="flex-1 px-3 pt-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2.5 py-[6px] rounded-[7px] text-[13px] transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-white/[0.1] text-white font-medium"
                  : "text-[#98989d] hover:bg-white/[0.05] hover:text-white/80"
              )}
            >
              <item.icon className={cn("h-[16px] w-[16px]", isActive && "text-[#0a84ff]")} />
              {item.label}
              {item.href === "/projects" && activeCount > 0 && (
                <span className="ml-auto text-[11px] font-medium text-[#30d158] tabular-nums">{activeCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center justify-between px-2.5 py-2 text-[11px] text-[#636366]">
          <span>Command palette</span>
          <kbd className="bg-white/[0.06] px-1.5 py-0.5 rounded text-[10px] font-mono">{modLabel}</kbd>
        </div>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-2.5 py-[6px] rounded-[7px] text-[13px] transition-all duration-150 cursor-pointer mt-1",
            pathname === "/settings"
              ? "bg-white/[0.1] text-white font-medium"
              : "text-[#636366] hover:bg-white/[0.05] hover:text-white/80"
          )}
        >
          <Settings className={cn("h-[16px] w-[16px]", pathname === "/settings" && "text-[#0a84ff]")} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
