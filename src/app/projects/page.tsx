"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects, useGitStatuses, useGitHubVisibility } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Search, Clock, MessageSquare, FolderOpen, RefreshCw, GitBranch } from "lucide-react";
import { GithubLink } from "@/components/icons/github";
import { formatDistanceToNow } from "date-fns";
import { formatCost } from "@/lib/pricing";
import Link from "next/link";

type SortKey = "lastActivity" | "name" | "sessionCount";

export default function ProjectsPage() {
  const { data: projects, isLoading, mutate, isValidating } = useProjects();
  const { data: gitStatuses } = useGitStatuses();
  const { data: visibility } = useGitHubVisibility();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!projects) return [];
    const g = new Set<string>();
    for (const p of projects) { if (p.group) g.add(p.group); }
    return Array.from(g).sort();
  }, [projects]);

  const filtered = projects
    ?.filter((p) => {
      const matchesText = p.name.toLowerCase().includes(filter.toLowerCase()) || (p.group?.toLowerCase().includes(filter.toLowerCase()) ?? false);
      const matchesGroup = !groupFilter || p.group === groupFilter;
      return matchesText && matchesGroup;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "sessionCount") return b.sessionCount - a.sessionCount;
      if (!a.lastActivity && !b.lastActivity) return 0;
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

  // Group by category
  const grouped = useMemo(() => {
    if (!filtered) return {};
    const map: Record<string, typeof filtered> = {};
    for (const p of filtered) {
      const key = p.group || "Standalone";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    const sorted: Record<string, typeof filtered> = {};
    const keys = Object.keys(map).sort((a, b) => {
      if (a === "Standalone") return 1;
      if (b === "Standalone") return -1;
      return a.localeCompare(b);
    });
    for (const k of keys) sorted[k] = map[k];
    return sorted;
  }, [filtered]);

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-[22px] font-semibold text-white/95 tracking-tight">Projects</h1>
          <p className="text-[13px] text-[#98989d] mt-0.5">{projects?.length ?? 0} projects</p>
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium text-[#98989d] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white active:scale-[0.96] transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
          {isValidating ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap animate-in" style={{ animationDelay: "50ms" }}>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#48484a]" />
          <Input
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-[30px] bg-white/[0.05] border-white/[0.06] text-[13px] text-white/80 placeholder:text-[#48484a] focus:border-[#0a84ff]/50 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#2c2c2e]/80 backdrop-blur-xl rounded-[8px] p-[3px] border-[0.5px] border-white/[0.06]">
          {(["lastActivity", "name", "sessionCount"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-[4px] rounded-[6px] text-[12px] font-medium cursor-pointer transition-all duration-200 active:scale-[0.96] ${
                sortBy === key
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-[#636366] hover:text-[#98989d]"
              }`}
            >
              {key === "lastActivity" ? "Recent" : key === "name" ? "Name" : "Sessions"}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap animate-in" style={{ animationDelay: "80ms" }}>
          <button
            onClick={() => setGroupFilter(null)}
            className="flex items-center gap-1.5 px-3 py-[5px] rounded-[8px] text-[12px] font-medium cursor-pointer transition-all duration-200 active:scale-[0.96]"
            style={{
              background: !groupFilter ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.04)",
              color: !groupFilter ? "#0a84ff" : "#636366",
            }}
          >
            All
          </button>
          {groups.map((g) => {
            const c = groupColor(g);
            const active = groupFilter === g;
            return (
              <button
                key={g}
                onClick={() => setGroupFilter(active ? null : g)}
                className="flex items-center gap-1.5 px-3 py-[5px] rounded-[8px] text-[12px] font-medium cursor-pointer transition-all duration-200 active:scale-[0.96]"
                style={{
                  background: active ? `${c}20` : "rgba(255,255,255,0.04)",
                  color: active ? c : "#636366",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c, opacity: active ? 1 : 0.4 }} />
                {g.replace("_", " ")}
              </button>
            );
          })}
        </div>
      )}

      {/* Grouped Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">{[...Array(9)].map((_, i) => <div key={i} className="h-28 shimmer" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items], gi) => (
            <div key={group} className="animate-in" style={{ animationDelay: `${100 + gi * 50}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="section-header !mb-0">{group}</p>
                <span className="text-[11px] text-[#48484a] tabular-nums">{items!.length} projects</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items!.map((project) => {
                  const accent = groupColor(project.group);
                  const git = gitStatuses?.[project.slug];
                  const href = `/projects/${project.slug}`;
                  return (
                    <div
                      key={project.slug}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(href)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(href);
                        }
                      }}
                      className="group relative overflow-hidden rounded-xl bg-[#2c2c2e]/80 backdrop-blur-xl border-[0.5px] border-white/[0.06] cursor-pointer h-full transition-all duration-250 hover:border-white/[0.12] hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] hover:scale-[1.015] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/50"
                    >
                        {/* Accent top bar */}
                        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}00)` }} />

                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
                                <FolderOpen className="h-4 w-4" style={{ color: accent }} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[13px] font-semibold text-white/95 truncate block">{project.name}</span>
                                {project.isActive && (
                                  <span className="text-[10px] text-[#30d158] font-medium flex items-center gap-1 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] live-dot" /> Live
                                  </span>
                                )}
                              </div>
                            </div>
                            {git?.remoteUrl && (
                              <div className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                                <GithubLink href={git.remoteUrl} visibility={visibility?.[project.slug]} />
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {project.description && (
                            <p className="text-[12px] text-[#98989d] line-clamp-2 leading-[1.5] mb-3">{project.description}</p>
                          )}

                          {/* Stats row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#636366] bg-white/[0.04] rounded-md px-2 py-[3px]">
                              <MessageSquare className="h-3 w-3" /> {project.sessionCount} sessions
                            </span>
                            <span className="text-[11px] text-[#636366] bg-white/[0.04] rounded-md px-2 py-[3px] tabular-nums">
                              {project.totalMessages.toLocaleString()} msgs
                            </span>
                            {project.totalCost > 0 && (
                              <span className="text-[11px] text-[#ffd60a]/80 bg-[#ffd60a]/[0.06] rounded-md px-2 py-[3px] tabular-nums">
                                {formatCost(project.totalCost)}
                              </span>
                            )}
                          </div>

                          {/* Git status row */}
                          {git?.hasGit && git.branch && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#8e8e93] font-mono tabular-nums">
                              <GitBranch className="h-3 w-3" />
                              <span className="truncate">{git.branch}</span>
                              {git.dirty > 0 && <span className="text-[#ff9f0a]">●{git.dirty}</span>}
                              {git.ahead > 0 && <span className="text-[#30d158]">↑{git.ahead}</span>}
                              {git.behind > 0 && <span className="text-[#ff453a]">↓{git.behind}</span>}
                            </div>
                          )}

                          {/* Time */}
                          {project.lastActivity && (
                            <p className="text-[11px] text-[#48484a] mt-2.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })}
                            </p>
                          )}
                        </div>

                        {/* Hover glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 0%, ${accent}08, transparent 60%)` }} />
                      </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GROUP_COLORS: Record<string, string> = {
  AGENTS: "#0a84ff",
  KARTEL: "#ff375f",
  VIDEO: "#bf5af2",
  WEB: "#ff9f0a",
  AUDIO: "#30d158",
  CRYPTO: "#ffd60a",
  GEN_STUDIO: "#00cec9",
  MISC: "#98989d",
  WEBSITES_Manager: "#ff6b6b",
  "3D": "#64dfdf",
  // Legacy lowercase names
  Agents: "#0a84ff",
  Video: "#bf5af2",
  Email: "#ff9f0a",
  Audio_Synths: "#30d158",
  crypto: "#ffd60a",
  Misc: "#98989d",
  Standalone: "#636366",
};

function groupColor(group: string | null): string {
  if (!group) return "#636366";
  return GROUP_COLORS[group] || "#0a84ff";
}
