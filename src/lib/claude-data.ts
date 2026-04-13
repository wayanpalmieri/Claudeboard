import path from "path";
import { resolveProjects, resolveProjectBySlug } from "./project-resolver";
import { getSessionsForProject, getSessionMessages } from "./session-parser";
import { getTodosForProject } from "./todo-aggregator";
import { getPlansForProject } from "./plan-matcher";
import { getActiveSessions } from "./active-session-monitor";
import type { ProjectMeta, ProjectDetail, SessionMessage } from "@/types/project";

export async function getAllProjects(): Promise<ProjectMeta[]> {
  const projects = resolveProjects();
  const activeSessions = getActiveSessions();
  const activeProjectSlugs = new Set(activeSessions.map((s) => s.projectSlug).filter(Boolean));

  const results: ProjectMeta[] = [];

  for (const project of projects) {
    const sessions = project.claudeDataPath
      ? await getSessionsForProject(project.claudeDataPath)
      : [];

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const lastSession = sessions[0]; // already sorted by modified desc

    // Build description from session titles and first prompts
    const description = deriveDescription(sessions);

    results.push({
      slug: project.slug,
      name: project.name,
      group: project.group,
      description,
      path: project.path,
      claudeDataPath: project.claudeDataPath || "",
      sessionCount: sessions.length,
      totalMessages,
      lastActivity: lastSession?.modified || null,
      gitBranch: lastSession?.gitBranch || "",
      isActive: activeProjectSlugs.has(project.slug),
    });
  }

  // Sort by last activity, most recent first
  results.sort((a, b) => {
    if (!a.lastActivity && !b.lastActivity) return a.name.localeCompare(b.name);
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  return results;
}

export async function getProjectDetail(slug: string): Promise<ProjectDetail | null> {
  const project = resolveProjectBySlug(slug);
  if (!project) return null;

  const sessions = project.claudeDataPath
    ? await getSessionsForProject(project.claudeDataPath)
    : [];
  const todos = getTodosForProject(slug);
  const plans = getPlansForProject(slug);
  const activeSessions = getActiveSessions();
  const isActive = activeSessions.some((s) => s.projectSlug === slug);

  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const lastSession = sessions[0];
  const description = deriveDescription(sessions);

  return {
    slug: project.slug,
    name: project.name,
    group: project.group,
    description,
    path: project.path,
    claudeDataPath: project.claudeDataPath || "",
    sessionCount: sessions.length,
    totalMessages,
    lastActivity: lastSession?.modified || null,
    gitBranch: lastSession?.gitBranch || "",
    isActive,
    sessions,
    todos,
    plans,
  };
}

export async function getSessionConversation(slug: string, sessionId: string): Promise<SessionMessage[]> {
  // Validate sessionId to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) return [];

  const project = resolveProjectBySlug(slug);
  if (!project?.claudeDataPath) return [];

  const jsonlPath = path.resolve(project.claudeDataPath, `${sessionId}.jsonl`);

  // Ensure resolved path stays within the claude data directory
  const baseDir = path.resolve(project.claudeDataPath);
  const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;
  if (!jsonlPath.startsWith(baseWithSep)) return [];

  return getSessionMessages(jsonlPath);
}

function deriveDescription(sessions: import("@/types/project").SessionEntry[]): string {
  if (sessions.length === 0) return "";

  // Prefer session titles — they're concise summaries
  const titles = sessions
    .map((s) => s.title)
    .filter((t): t is string => !!t && t.length > 5)
    .slice(0, 5);

  if (titles.length > 0) {
    // Use the first (most recent) title as the main description
    return titles[0];
  }

  // Fall back to first prompt of the most recent session
  const prompt = sessions[0]?.firstPrompt;
  if (prompt) return prompt.slice(0, 120);

  return "";
}
