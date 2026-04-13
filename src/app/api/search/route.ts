import { NextResponse } from "next/server";
import { resolveProjects } from "@/lib/project-resolver";
import { getSessionsForProject } from "@/lib/session-parser";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");
  if (!rawQuery || rawQuery.length > 200) return NextResponse.json([]);
  const query = rawQuery.toLowerCase();

  const projects = resolveProjects();
  const results: Array<{
    projectSlug: string;
    projectName: string;
    sessionId: string;
    title: string | null;
    firstPrompt: string;
    modified: string;
    matchField: string;
  }> = [];

  for (const project of projects) {
    if (!project.claudeDataPath) continue;
    const sessions = await getSessionsForProject(project.claudeDataPath);

    for (const session of sessions) {
      const titleMatch = session.title?.toLowerCase().includes(query);
      const promptMatch = session.firstPrompt.toLowerCase().includes(query);
      const projectMatch = project.name.toLowerCase().includes(query);

      if (titleMatch || promptMatch || projectMatch) {
        results.push({
          projectSlug: project.slug,
          projectName: project.name,
          sessionId: session.sessionId,
          title: session.title,
          firstPrompt: session.firstPrompt,
          modified: session.modified,
          matchField: titleMatch ? "title" : promptMatch ? "prompt" : "project",
        });
      }
    }
  }

  results.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  return NextResponse.json(results.slice(0, 50));
}
