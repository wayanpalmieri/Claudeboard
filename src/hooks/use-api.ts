"use client";

import useSWR from "swr";
import type { ProjectMeta, ProjectDetail, SessionMessage, ActiveSession, TodoItem, PlanEntry, DailyActivity } from "@/types/project";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProjects() {
  return useSWR<ProjectMeta[]>("/api/projects", (url) => fetch(`${url}?t=${Date.now()}`).then((r) => r.json()), { refreshInterval: 30000 });
}

export function useProject(slug: string) {
  return useSWR<ProjectDetail>(slug ? `/api/projects/${slug}` : null, fetcher);
}

export function useSessionMessages(slug: string, sessionId: string) {
  return useSWR<SessionMessage[]>(
    slug && sessionId ? `/api/projects/${slug}/sessions/${sessionId}` : null,
    fetcher
  );
}

export function useActiveSessions() {
  return useSWR<ActiveSession[]>("/api/active-sessions", fetcher, { refreshInterval: 5000 });
}

export function useStats() {
  return useSWR<{
    activity: DailyActivity[];
    totals: { totalMessages: number; totalSessions: number; totalToolCalls: number };
  }>("/api/stats", fetcher);
}

export function useInsights(refresh?: boolean) {
  return useSWR<{
    lastRun: string;
    insights: Array<{
      type: "warning" | "suggestion" | "opportunity" | "health";
      priority: "high" | "medium" | "low";
      project: string;
      projectSlug: string;
      title: string;
      description: string;
      metric?: string;
    }>;
  }>(refresh ? "/api/insights?refresh=1" : "/api/insights", fetcher);
}

export function useTasks() {
  return useSWR<{
    todos: TodoItem[];
    byProject: Record<string, TodoItem[]>;
    plans: PlanEntry[];
    stats: { total: number; pending: number; inProgress: number; completed: number };
  }>("/api/tasks", fetcher);
}

export interface SearchResult {
  projectSlug: string;
  projectName: string;
  sessionId: string;
  title: string | null;
  firstPrompt: string;
  modified: string;
  matchField: string;
}

export function useSearch(query: string) {
  return useSWR<SearchResult[]>(
    query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { dedupingInterval: 300 }
  );
}

export async function launchProject(slug: string, target: "vscode" | "terminal" | "claude") {
  const res = await fetch("/api/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, target }),
  });
  const data = await res.json();
  if (!res.ok) console.error("Launch failed:", data);
  return data;
}
