import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { PATHS } from "./config";
import { safeParse } from "./safe-json";
import { resolveProjects } from "./project-resolver";
import type { ActiveSession } from "@/types/project";

export function getActiveSessions(): ActiveSession[] {
  const sessionsDir = PATHS.sessions;
  if (!fs.existsSync(sessionsDir)) return [];

  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
  const projects = resolveProjects();
  const sessions: ActiveSession[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(sessionsDir, file), "utf-8");
      const data = safeParse<{ pid?: number; sessionId?: string; cwd?: string; startedAt?: number; kind?: string; entrypoint?: string }>(raw);
      if (!data.pid || !data.sessionId) continue;

      const isAlive = checkPid(data.pid);
      const projectSlug = matchCwdToProject(data.cwd || "", projects);

      sessions.push({
        pid: data.pid,
        sessionId: data.sessionId,
        cwd: data.cwd || "",
        startedAt: data.startedAt || 0,
        kind: data.kind || "unknown",
        entrypoint: data.entrypoint || "",
        projectSlug: projectSlug || undefined,
        isAlive,
      });
    } catch {
      // skip malformed
    }
  }

  return sessions.filter((s) => s.isAlive);
}

function checkPid(pid: number): boolean {
  if (typeof pid !== "number" || pid < 1 || !Number.isInteger(pid)) return false;
  if (process.platform === "win32") {
    // tasklist exits 0 even when no process matches, so inspect stdout.
    const res = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"], {
      encoding: "utf-8",
    });
    if (res.status !== 0 || !res.stdout) return false;
    return res.stdout.includes(`"${pid}"`);
  }
  const res = spawnSync("ps", ["-p", String(pid)], { stdio: "ignore" });
  return res.status === 0;
}

function matchCwdToProject(
  cwd: string,
  projects: ReturnType<typeof resolveProjects>
): string | null {
  if (!cwd) return null;
  for (const project of projects) {
    if (cwd.startsWith(project.path)) return project.slug;
  }
  return null;
}
