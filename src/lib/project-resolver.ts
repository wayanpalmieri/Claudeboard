import fs from "fs";
import path from "path";
import { getCuratedFolder, getSettings, PATHS, encodePath, slugify } from "./config";

export interface ResolvedProject {
  slug: string;
  name: string;
  group: string | null; // parent folder name (e.g., "KARTEL", "Video", "Agents")
  path: string;
  claudeDataPath: string | null;
}

let projectCacheTime = 0;
let projectCacheData: ResolvedProject[] = [];

// Directories that are never projects
const IGNORED_DIRS = new Set([
  "__pycache__", "node_modules", ".git", "dist", "build", ".next",
  "docs", "static", "templates", "published", "Elements", "Image_assets",
  "OG_BACKUPS", "ideas",
]);

// Folders that are project containers (have sub-projects), not projects themselves
function isGroupFolder(dirPath: string): boolean {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".") && !IGNORED_DIRS.has(e.name));
  // If it has project markers (package.json, app.py, etc.), it's a project, not a group
  const hasProjectMarkers = entries.some(
    (e) => e.name === "package.json" || e.name === "index.html" || e.name === "main.py" ||
           e.name === "Cargo.toml" || e.name === "app.py" || e.name === "requirements.txt"
  );
  if (hasProjectMarkers) return false;
  // Has at least 1 non-ignored subdirectory = group folder
  return subdirs.length >= 1;
}

function isProject(dirName: string): boolean {
  return !IGNORED_DIRS.has(dirName);
}

export function clearProjectCache() {
  projectCacheTime = 0;
  projectCacheData = [];
}

export function resolveProjects(): ResolvedProject[] {
  const folderStat = fs.statSync(getCuratedFolder(), { throwIfNoEntry: false });
  const mtime = folderStat?.mtimeMs ?? 0;
  if (projectCacheTime === mtime && projectCacheData.length > 0) return projectCacheData;

  const projects: ResolvedProject[] = [];
  const seenSlugs = new Set<string>();

  function addProject(dirPath: string, name: string, group: string | null) {
    let slug = slugify(group ? `${group}-${name}` : name);
    // Ensure unique slugs by appending counter
    let base = slug;
    let counter = 2;
    while (seenSlugs.has(slug)) {
      slug = `${base}-${counter}`;
      counter++;
    }
    seenSlugs.add(slug);

    const encoded = encodePath(dirPath);
    const claudeDir = path.join(PATHS.projects, encoded);
    const claudeDataPath = fs.existsSync(claudeDir) ? claudeDir : findAlternatePath(dirPath, name, group);

    projects.push({ slug, name, group, path: dirPath, claudeDataPath });
  }

  const excluded = new Set(getSettings().excludedFolders.map(f => f.toLowerCase()));

  const topEntries = fs.readdirSync(getCuratedFolder(), { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (excluded.has(entry.name.toLowerCase())) continue;

    const dirPath = path.join(getCuratedFolder(), entry.name);

    if (isGroupFolder(dirPath)) {
      // Scan sub-projects
      const subEntries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || sub.name.startsWith(".") || !isProject(sub.name)) continue;
        if (excluded.has(sub.name.toLowerCase())) continue;
        addProject(path.join(dirPath, sub.name), sub.name, entry.name);
      }
    } else {
      addProject(dirPath, entry.name, null);
    }
  }

  projectCacheTime = mtime;
  projectCacheData = projects;
  return projects;
}

function findAlternatePath(dirPath: string, name: string, group: string | null): string | null {
  // Try old path format (without SORT/Projects)
  const oldStyleParts = dirPath.replace(/.*Claude-Code-apps\//, "").replace(/\//g, "-");
  const altOld = path.join(PATHS.projects, `-Users-wayanpalmieri-Downloads-Claude-Code-apps-${oldStyleParts}`);
  if (fs.existsSync(altOld)) return altOld;

  // Try matching by encoded suffix
  try {
    const allDirs = fs.readdirSync(PATHS.projects);
    // Match full group/name path
    if (group) {
      const suffix = `-${group}-${name}`;
      const match = allDirs.find((d) => d.endsWith(suffix));
      if (match) return path.join(PATHS.projects, match);
    }
    // Match just the name
    const nameSuffix = `-${name}`;
    const nameMatch = allDirs.find((d) => d.endsWith(nameSuffix));
    if (nameMatch) return path.join(PATHS.projects, nameMatch);
  } catch {
    // ignore
  }

  return null;
}

export function resolveProjectBySlug(slug: string): ResolvedProject | null {
  return resolveProjects().find((p) => p.slug === slug) ?? null;
}

export function getGroups(): string[] {
  const groups = new Set<string>();
  for (const p of resolveProjects()) {
    if (p.group) groups.add(p.group);
  }
  return Array.from(groups).sort();
}
