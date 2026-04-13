import fs from "fs";
import path from "path";
import { PATHS } from "./config";
import { resolveProjects } from "./project-resolver";
import { getSessionsForProject } from "./session-parser";
import { safeParse } from "./safe-json";
import type { StatsCache, DailyActivity } from "@/types/project";

export function getStats(): StatsCache | null {
  try {
    const raw = fs.readFileSync(PATHS.statsCache, "utf-8");
    return safeParse<StatsCache>(raw);
  } catch {
    return null;
  }
}

export async function getDailyActivity(days: number = 90): Promise<DailyActivity[]> {
  const stats = getStats();
  const cached = stats?.dailyActivity ?? [];
  const lastCachedDate = stats?.lastComputedDate || "1970-01-01";

  // Compute activity from sessions for dates after the cache ends
  const sessionActivity = await computeRecentActivity(lastCachedDate);

  // Merge: cached data + computed data (session-derived wins for overlapping dates)
  const merged = new Map<string, DailyActivity>();
  for (const d of cached) {
    merged.set(d.date, d);
  }
  for (const d of sessionActivity) {
    const existing = merged.get(d.date);
    if (existing) {
      // Keep whichever has more messages (cached stats are more accurate when available)
      if (d.messageCount > existing.messageCount) merged.set(d.date, d);
    } else {
      merged.set(d.date, d);
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return Array.from(merged.values())
    .filter((d) => new Date(d.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getTotalStats(): { totalMessages: number; totalSessions: number; totalToolCalls: number } {
  const stats = getStats();
  if (!stats?.dailyActivity) return { totalMessages: 0, totalSessions: 0, totalToolCalls: 0 };

  return stats.dailyActivity.reduce(
    (acc, d) => ({
      totalMessages: acc.totalMessages + d.messageCount,
      totalSessions: acc.totalSessions + d.sessionCount,
      totalToolCalls: acc.totalToolCalls + d.toolCallCount,
    }),
    { totalMessages: 0, totalSessions: 0, totalToolCalls: 0 }
  );
}

async function computeRecentActivity(afterDate: string): Promise<DailyActivity[]> {
  const projects = resolveProjects();
  const dailyMap = new Map<string, { messages: number; sessions: Set<string> }>();

  for (const project of projects) {
    if (!project.claudeDataPath) continue;
    const sessions = await getSessionsForProject(project.claudeDataPath);

    for (const session of sessions) {
      // Only process sessions that have activity after the cache cutoff
      if (session.modified <= afterDate && session.created <= afterDate) continue;

      // Use the session's created date as the activity date
      const date = session.created.slice(0, 10); // YYYY-MM-DD
      if (date <= afterDate) continue;

      if (!dailyMap.has(date)) dailyMap.set(date, { messages: 0, sessions: new Set() });
      const day = dailyMap.get(date)!;
      day.messages += session.messageCount;
      day.sessions.add(session.sessionId);
    }
  }

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    messageCount: data.messages,
    sessionCount: data.sessions.size,
    toolCallCount: 0, // Can't compute from session metadata alone
  }));
}
