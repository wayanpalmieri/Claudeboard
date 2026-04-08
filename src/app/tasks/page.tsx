"use client";

import { useState } from "react";
import { useInsights } from "@/hooks/use-api";
import { AlertTriangle, Lightbulb, Rocket, HeartPulse, ChevronRight, RefreshCw, Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type InsightType = "all" | "warning" | "suggestion" | "opportunity" | "health";

const TYPE_CONFIG = {
  warning: { label: "Issues", icon: AlertTriangle, color: "#ff453a" },
  suggestion: { label: "Suggestions", icon: Lightbulb, color: "#ff9f0a" },
  opportunity: { label: "Opportunities", icon: Rocket, color: "#0a84ff" },
  health: { label: "Healthy", icon: HeartPulse, color: "#30d158" },
} as const;

export default function InsightsPage() {
  const [filter, setFilter] = useState<InsightType>("all");
  const [forceRefresh, setForceRefresh] = useState(false);
  const { data, isLoading, mutate, isValidating } = useInsights(forceRefresh);

  const insights = data?.insights ?? [];
  const lastRun = data?.lastRun;
  const filtered = filter === "all" ? insights : insights.filter(i => i.type === filter);

  const counts = {
    all: insights.length,
    warning: insights.filter(i => i.type === "warning").length,
    suggestion: insights.filter(i => i.type === "suggestion").length,
    opportunity: insights.filter(i => i.type === "opportunity").length,
    health: insights.filter(i => i.type === "health").length,
  };

  function handleRefresh() {
    setForceRefresh(true);
    mutate();
    setTimeout(() => setForceRefresh(false), 1000);
  }

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-[900px]">
      <div className="h-7 w-40 shimmer" />
      <div className="h-4 w-64 shimmer" />
      <div className="grid grid-cols-4 gap-3 mt-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[72px] shimmer" />)}</div>
      <div className="space-y-3 mt-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 shimmer" />)}</div>
    </div>
  );

  const filterButtons: { key: InsightType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "warning", label: "Issues" },
    { key: "suggestion", label: "Suggestions" },
    { key: "opportunity", label: "Opportunities" },
    { key: "health", label: "Healthy" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between animate-in">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#bf5af2]" />
            <h1 className="text-[22px] font-semibold text-white/95 tracking-tight">Insights</h1>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[13px] text-[#98989d]">Automated project analysis</p>
            {lastRun && (
              <span className="flex items-center gap-1 text-[11px] text-[#48484a]">
                <Clock className="h-3 w-3" />
                Last scan {formatDistanceToNow(new Date(lastRun), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-[#98989d] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white active:scale-[0.96] transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
          {isValidating ? "Scanning..." : "Re-scan"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 animate-in" style={{ animationDelay: "50ms" }}>
        {(["warning", "suggestion", "opportunity", "health"] as const).map(type => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? "all" : type)}
              className={`p-3 rounded-[10px] text-left cursor-pointer transition-all duration-200 active:scale-[0.97] border-[0.5px] ${
                filter === type ? "border-white/[0.12] bg-white/[0.06]" : "border-white/[0.04] bg-[rgba(44,44,46,0.5)] hover:bg-[rgba(44,44,46,0.72)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                <span className="text-[18px] font-semibold text-white tabular-nums">{counts[type]}</span>
              </div>
              <p className="text-[11px] text-[#636366]">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-[#2c2c2e]/80 backdrop-blur-xl rounded-[8px] p-[3px] border-[0.5px] border-white/[0.06] w-fit animate-in" style={{ animationDelay: "100ms" }}>
        {filterButtons.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-[4px] rounded-[6px] text-[12px] font-medium cursor-pointer transition-all duration-200 active:scale-[0.96] ${
              filter === f.key ? "bg-white/[0.1] text-white shadow-sm" : "text-[#636366] hover:text-[#98989d]"
            }`}
          >
            {f.label}
            <span className="text-[10px] tabular-nums opacity-60 ml-1">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Auto-scan indicator */}
      <div className="flex items-center gap-2 px-1 animate-in" style={{ animationDelay: "120ms" }}>
        <div className="h-1.5 w-1.5 rounded-full bg-[#30d158] live-dot" />
        <span className="text-[11px] text-[#48484a]">Auto-scanning every 30 minutes</span>
      </div>

      {/* Insights list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 animate-in" style={{ animationDelay: "150ms" }}>
          <HeartPulse className="h-8 w-8 text-[#30d158] mx-auto mb-3 opacity-50" />
          <p className="text-[14px] text-[#636366]">Everything looks good</p>
          <p className="text-[12px] text-[#48484a] mt-1">No insights for this filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((insight, i) => {
            const cfg = TYPE_CONFIG[insight.type];
            const Icon = cfg.icon;

            return (
              <Link key={`${insight.projectSlug}-${insight.title}-${i}`} href={`/projects/${insight.projectSlug}`}>
                <div
                  className="group relative overflow-hidden rounded-[10px] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl border-[0.5px] border-white/[0.06] p-4 cursor-pointer transition-all duration-200 hover:border-white/[0.1] hover:bg-[rgba(58,58,60,0.72)] animate-in"
                  style={{ animationDelay: `${150 + i * 30}ms` }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[10px]" style={{ background: cfg.color }} />

                  <div className="flex items-start gap-3 pl-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cfg.color}15` }}>
                      <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-white/90">{insight.title}</span>
                        {insight.priority === "high" && (
                          <span className="text-[9px] font-medium text-[#ff453a] bg-[#ff453a]/10 px-1.5 py-0.5 rounded-[4px] uppercase">High</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#98989d] leading-relaxed">{insight.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-[#0a84ff]/70 bg-[#0a84ff]/10 px-1.5 py-0.5 rounded-[4px] font-medium">{insight.project}</span>
                        {insight.metric && <span className="text-[11px] text-[#48484a] tabular-nums">{insight.metric}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#38383a] group-hover:text-[#636366] transition-colors shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
