import fs from "fs";
import path from "path";
import { PATHS } from "./config";
import { resolveProjects } from "./project-resolver";
import { safeParse } from "./safe-json";
import type { TodoItem } from "@/types/project";

export function aggregateTodos(): { todos: TodoItem[]; byProject: Record<string, TodoItem[]> } {
  const todosDir = PATHS.todos;
  if (!fs.existsSync(todosDir)) return { todos: [], byProject: {} };

  const files = fs.readdirSync(todosDir).filter((f) => f.endsWith(".json"));
  const allTodos: TodoItem[] = [];
  const sessionToProject = buildSessionProjectMap();

  for (const file of files) {
    const filePath = path.join(todosDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const items = safeParse<TodoItem[]>(raw);
      if (!Array.isArray(items) || items.length === 0) continue;

      // Extract session ID from filename: {sessionId}-agent-{agentId}.json
      const sessionId = file.split("-agent-")[0];
      const projectSlug = sessionToProject.get(sessionId);

      for (const item of items) {
        allTodos.push({
          ...item,
          sessionId,
          projectSlug: projectSlug || undefined,
        });
      }
    } catch {
      // skip malformed
    }
  }

  const byProject: Record<string, TodoItem[]> = {};
  for (const todo of allTodos) {
    const key = todo.projectSlug || "_unassigned";
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(todo);
  }

  return { todos: allTodos, byProject };
}

function buildSessionProjectMap(): Map<string, string> {
  const map = new Map<string, string>();
  const projects = resolveProjects();

  for (const project of projects) {
    if (!project.claudeDataPath || !fs.existsSync(project.claudeDataPath)) continue;

    try {
      const files = fs.readdirSync(project.claudeDataPath).filter((f) => f.endsWith(".jsonl"));
      for (const file of files) {
        const sessionId = path.basename(file, ".jsonl");
        map.set(sessionId, project.slug);
      }
    } catch {
      // skip
    }
  }

  return map;
}

export function getTodosForProject(slug: string): TodoItem[] {
  const { byProject } = aggregateTodos();
  return byProject[slug] || [];
}
