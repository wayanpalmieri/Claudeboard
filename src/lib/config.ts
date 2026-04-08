import path from "path";
import os from "os";
import fs from "fs";

const home = os.homedir();

export const CLAUDE_DATA_DIR = process.env.CLAUDE_DATA_DIR || path.join(home, ".claude");

// Persistent settings file stored next to the app
const SETTINGS_PATH = path.join(process.cwd(), "zmanager-settings.json");

const DEFAULT_CURATED_FOLDER = path.join(home, "Downloads", "SORT", "Projects", "Claude-Code-apps");

export interface AppSettings {
  projectsFolder: string;
  excludedFolders: string[];
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
      const data = JSON.parse(raw);
      return {
        projectsFolder: data.projectsFolder || DEFAULT_CURATED_FOLDER,
        excludedFolders: Array.isArray(data.excludedFolders) ? data.excludedFolders : [],
      };
    }
  } catch {
    // ignore
  }
  return { projectsFolder: DEFAULT_CURATED_FOLDER, excludedFolders: [] };
}

export function saveSettings(settings: Partial<AppSettings>) {
  const current = getSettings();
  const merged = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2));
  // Reset CURATED_FOLDER cache
  _curatedFolder = merged.projectsFolder;
}

let _curatedFolder: string | null = null;

export function getCuratedFolder(): string {
  if (!_curatedFolder) {
    _curatedFolder = getSettings().projectsFolder;
  }
  return _curatedFolder;
}

// Keep backward compat — but now reads from settings
export const CURATED_FOLDER = getCuratedFolder();

export const PATHS = {
  projects: path.join(CLAUDE_DATA_DIR, "projects"),
  todos: path.join(CLAUDE_DATA_DIR, "todos"),
  plans: path.join(CLAUDE_DATA_DIR, "plans"),
  sessions: path.join(CLAUDE_DATA_DIR, "sessions"),
  statsCache: path.join(CLAUDE_DATA_DIR, "stats-cache.json"),
  history: path.join(CLAUDE_DATA_DIR, "history.jsonl"),
};

export function encodePath(fsPath: string): string {
  return fsPath.replace(/\//g, "-");
}

export function decodePath(encoded: string): string {
  return encoded.replace(/-/g, "/");
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
