"use client";

import { useInsights, useActiveSessions } from "@/hooks/use-api";
import { AlertTriangle, Lightbulb, Rocket, Sparkles, ChevronRight, Sun } from "lucide-react";
import Link from "next/link";

const TYPE_CONFIG = {
  warning: { icon: AlertTriangle, color: "#ff453a" },
  suggestion: { icon: Lightbulb, color: "#ff9f0a" },
  opportunity: { icon: Rocket, color: "#0a84ff" },
  health: { icon: Sparkles, color: "#30d158" },
} as const;

export function DailyBriefing() {
  const { data } = useInsights();
  const { data: activeSessions } = useActiveSessions();

  const insights = data?.insights ?? [];

  // Pick top priorities: high-priority warnings first, then medium items
  const topPriorities = [...insights]
    .filter(i => i.type !== "health")
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    })
    .slice(0, 3);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (topPriorities.length === 0 && (!activeSessions || activeSessions.length === 0)) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-[14px] p-5 animate-in"
         style={{
           background: "linear-gradient(135deg, rgba(10,132,255,0.08) 0%, rgba(191,90,242,0.05) 100%)",
           border: "0.5px solid rgba(255,255,255,0.08)",
           animationDelay: "10ms",
         }}
    >
      {/* Decorative sun icon */}
      <div className="absolute top-0 right-0 opacity-[0.05]">
        <Sun className="h-32 w-32 text-white" strokeWidth={1} />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="h-4 w-4 text-[#ff9f0a]" />
          <span className="text-[12px] font-medium text-[#ff9f0a] tracking-wide uppercase">{greeting}</span>
        </div>
        <h2 className="text-[17px] font-semibold text-white/95 tracking-tight">Today&apos;s Focus</h2>
        <p className="text-[12px] text-[#98989d] mt-0.5">
          {topPriorities.length > 0
            ? `${topPriorities.length} ${topPriorities.length === 1 ? "item" : "items"} need your attention`
            : "All clear. Keep up the momentum."}
        </p>

        {topPriorities.length > 0 && (
          <div className="mt-4 space-y-2">
            {topPriorities.map((insight, i) => {
              const cfg = TYPE_CONFIG[insight.type];
              const Icon = cfg.icon;
              return (
                <Link key={i} href={`/projects/${insight.projectSlug}`}>
                  <div className="group flex items-center gap-3 px-3 py-2.5 rounded-[9px] bg-white/[0.03] hover:bg-white/[0.06] border-[0.5px] border-white/[0.04] cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/90 truncate">{insight.title}</span>
                        {insight.priority === "high" && (
                          <span className="text-[9px] font-medium text-[#ff453a] bg-[#ff453a]/10 px-1.5 py-0.5 rounded-[4px] uppercase shrink-0">High</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#636366] truncate">{insight.project} · {insight.description.slice(0, 80)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#38383a] group-hover:text-[#636366] transition-colors shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {insights.length > topPriorities.length && (
          <Link href="/tasks" className="inline-flex items-center gap-1 text-[12px] text-[#0a84ff] hover:text-[#409cff] mt-3 transition-colors">
            View all {insights.length} insights <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
