"use client";

import { useProjects, useStats, useActiveSessions, useGitStatuses, useGitHubVisibility } from "@/hooks/use-api";
import { FolderOpen, MessageSquare, Zap, Activity, GitBranch, ChevronRight, DollarSign } from "lucide-react";
import { GithubLink } from "@/components/icons/github";
import { formatDistanceToNow } from "date-fns";
import { formatCost } from "@/lib/pricing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { DailyBriefing } from "@/components/dashboard/daily-briefing";

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activeSessions } = useActiveSessions();
  const { data: gitStatuses } = useGitStatuses();
  const { data: visibility } = useGitHubVisibility();
  const router = useRouter();

  const totalSessions = projects?.reduce((s, p) => s + p.sessionCount, 0) ?? 0;
  const totalCost = projects?.reduce((s, p) => s + (p.totalCost ?? 0), 0) ?? 0;
  const activeCount = activeSessions?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div className="animate-in">
        <h1 className="text-[22px] font-semibold text-white/95 tracking-tight">Dashboard</h1>
      </div>

      <DailyBriefing />

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Projects", value: projects?.length ?? 0, icon: FolderOpen, color: "#0a84ff", loading: projectsLoading },
          { label: "Sessions", value: totalSessions, icon: MessageSquare, color: "#bf5af2", loading: projectsLoading },
          { label: "Messages", value: stats?.totals.totalMessages ?? 0, icon: Zap, color: "#ff9f0a", loading: statsLoading, fmt: true },
          { label: "Total Cost", value: formatCost(totalCost), icon: DollarSign, color: "#ffd60a", loading: projectsLoading, isStr: true },
          { label: "Active", value: activeCount, icon: Activity, color: "#30d158", loading: false, live: activeCount > 0 },
        ].map((s, i) => (
          <div key={s.label} className="surface-elevated p-4 animate-in !transform-none" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#98989d]">{s.label}</span>
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
            </div>
            {s.loading ? <div className="h-7 w-16 shimmer" /> : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-semibold text-white tabular-nums">{s.isStr ? s.value : (s.fmt ? (s.value as number).toLocaleString() : s.value)}</span>
                {s.live && <div className="h-2 w-2 rounded-full bg-[#30d158] live-dot mb-0.5" />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Activity */}
      {stats?.activity && stats.activity.length > 0 && (
        <div className="surface p-4 animate-in" style={{ animationDelay: "200ms" }}>
          <p className="section-header mb-3">Activity</p>
          <ActivityChart data={stats.activity} />
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="animate-in" style={{ animationDelay: "250ms" }}>
          <p className="section-header">Live Sessions</p>
          <div className="overflow-hidden rounded-[10px]">
            {activeSessions.map((s, i) => (
              <div key={s.pid} className="list-row flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-[#30d158] live-dot" />
                  <span className="text-[13px] text-white/90 font-medium">{s.projectSlug || "Unknown"}</span>
                  <span className="text-[11px] text-[#48484a] tabular-nums">PID {s.pid}</span>
                </div>
                <span className="text-[11px] text-[#48484a]">{s.entrypoint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="animate-in" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="section-header !mb-0">Recent Projects</p>
          <Link href="/projects" className="text-[13px] text-[#0a84ff] hover:text-[#409cff] transition-colors cursor-pointer">
            See All
          </Link>
        </div>
        {projectsLoading ? (
          <div className="space-y-1"><div className="h-[58px] shimmer" /><div className="h-[58px] shimmer" /><div className="h-[58px] shimmer" /></div>
        ) : (
          <div className="overflow-hidden rounded-[10px]">
            {projects?.slice(0, 8).map((project) => {
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
                  className="list-row flex items-center justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/50"
                >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/90 truncate">{project.name}</span>
                        {project.group && <span className="text-[10px] text-[#0a84ff]/70 bg-[#0a84ff]/10 px-1.5 py-0.5 rounded-[4px] shrink-0">{project.group}</span>}
                        {project.isActive && <div className="h-1.5 w-1.5 rounded-full bg-[#30d158] shrink-0" />}
                        {git?.hasGit && git.branch && (
                          <span className="flex items-center gap-1 text-[10px] text-[#8e8e93] bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] shrink-0 font-mono">
                            <GitBranch className="h-2.5 w-2.5" /> {git.branch}
                            {git.dirty > 0 && <span className="text-[#ff9f0a]">●{git.dirty}</span>}
                            {git.ahead > 0 && <span className="text-[#30d158]">↑{git.ahead}</span>}
                            {git.behind > 0 && <span className="text-[#ff453a]">↓{git.behind}</span>}
                          </span>
                        )}
                      </div>
                      {project.description && <p className="text-[12px] text-[#636366] truncate mt-0.5">{project.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3 tabular-nums">
                      {git?.remoteUrl && (
                        <GithubLink href={git.remoteUrl} visibility={visibility?.[project.slug]} />
                      )}
                      {project.totalCost > 0 && <span className="text-[11px] text-[#ffd60a]/80">{formatCost(project.totalCost)}</span>}
                      {project.lastActivity && <span className="text-[11px] text-[#48484a]">{formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })}</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-[#48484a] group-hover:text-[#98989d] transition-colors" />
                    </div>
                  </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
