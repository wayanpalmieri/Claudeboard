import fs from "fs";
import path from "path";
import readline from "readline";
import { safeParse } from "./safe-json";
import type { SessionEntry, SessionMessage } from "@/types/project";

interface SessionIndexFile {
  version: number;
  entries: Array<{
    sessionId: string;
    fullPath: string;
    firstPrompt: string;
    messageCount: number;
    created: string;
    modified: string;
    gitBranch: string;
    isSidechain: boolean;
  }>;
}

const metadataCache = new Map<string, { data: SessionEntry[]; mtime: number }>();

export async function getSessionsForProject(claudeDataPath: string): Promise<SessionEntry[]> {
  if (!claudeDataPath || !fs.existsSync(claudeDataPath)) return [];

  // Check cache by directory mtime
  const stat = fs.statSync(claudeDataPath);
  const cached = metadataCache.get(claudeDataPath);
  if (cached && cached.mtime === stat.mtimeMs) return cached.data;

  // Try sessions-index.json first
  const indexPath = path.join(claudeDataPath, "sessions-index.json");
  if (fs.existsSync(indexPath)) {
    try {
      const raw = fs.readFileSync(indexPath, "utf-8");
      const index = safeParse(raw) as SessionIndexFile;
      const entries: SessionEntry[] = index.entries.map((e) => ({
        sessionId: e.sessionId,
        title: null,
        firstPrompt: e.firstPrompt || "",
        messageCount: e.messageCount,
        created: e.created,
        modified: e.modified,
        gitBranch: e.gitBranch || "",
        isSidechain: e.isSidechain || false,
        entrypoint: "",
      }));

      // Enrich with ai-title from JSONL if available
      for (const entry of entries) {
        const jsonlPath = path.join(claudeDataPath, `${entry.sessionId}.jsonl`);
        if (fs.existsSync(jsonlPath)) {
          entry.title = await extractTitle(jsonlPath);
        }
      }

      metadataCache.set(claudeDataPath, { data: entries, mtime: stat.mtimeMs });
      return entries;
    } catch {
      // Fall through to JSONL scanning
    }
  }

  // No index — scan JSONL files
  const files = fs.readdirSync(claudeDataPath).filter((f) => f.endsWith(".jsonl"));
  const entries: SessionEntry[] = [];

  for (const file of files) {
    const jsonlPath = path.join(claudeDataPath, file);
    const sessionId = path.basename(file, ".jsonl");
    const meta = await parseSessionMetadata(jsonlPath, sessionId);
    if (meta) entries.push(meta);
  }

  entries.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  metadataCache.set(claudeDataPath, { data: entries, mtime: stat.mtimeMs });
  return entries;
}

async function extractTitle(jsonlPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream });
    let found = false;

    rl.on("line", (line) => {
      if (found) return;
      try {
        const entry = safeParse(line) as { type?: string; aiTitle?: string };
        if (entry.type === "ai-title" && entry.aiTitle) {
          found = true;
          rl.close();
          stream.destroy();
          resolve(entry.aiTitle);
        }
      } catch {
        // skip malformed lines
      }
    });

    rl.on("close", () => {
      if (!found) resolve(null);
    });
  });
}

async function parseSessionMetadata(jsonlPath: string, sessionId: string): Promise<SessionEntry | null> {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream });

    let title: string | null = null;
    let firstPrompt = "";
    let created: string | null = null;
    let modified: string | null = null;
    let gitBranch = "";
    let entrypoint = "";
    let messageCount = 0;
    let isSidechain = false;

    rl.on("line", (line) => {
      try {
        const entry = safeParse(line) as SessionMessage;

        if (entry.timestamp) {
          if (!created || entry.timestamp < created) created = entry.timestamp;
          if (!modified || entry.timestamp > modified) modified = entry.timestamp;
        }

        if (entry.type === "ai-title" && entry.aiTitle) {
          title = entry.aiTitle;
        }

        if (entry.type === "user") {
          messageCount++;
          if (!firstPrompt && entry.message?.content) {
            const textBlock = entry.message.content.find((c) => c.type === "text");
            if (textBlock && "text" in textBlock) {
              firstPrompt = textBlock.text.slice(0, 200);
            }
          }
          if (entry.isSidechain) isSidechain = true;
        }

        if (entry.type === "assistant") {
          messageCount++;
        }

        if (entry.gitBranch && !gitBranch) gitBranch = entry.gitBranch;
        if (entry.entrypoint && !entrypoint) entrypoint = entry.entrypoint;
      } catch {
        // skip malformed
      }
    });

    rl.on("close", () => {
      if (!created) {
        resolve(null);
        return;
      }
      resolve({
        sessionId,
        title,
        firstPrompt,
        messageCount,
        created: created!,
        modified: modified || created!,
        gitBranch,
        isSidechain,
        entrypoint,
      });
    });
  });
}

export async function getSessionMessages(jsonlPath: string): Promise<SessionMessage[]> {
  if (!fs.existsSync(jsonlPath)) return [];

  const messages: SessionMessage[] = [];
  const stream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream });

  return new Promise((resolve) => {
    rl.on("line", (line) => {
      try {
        const entry = safeParse(line) as SessionMessage;
        // Only include displayable message types
        if (["user", "assistant", "ai-title"].includes(entry.type)) {
          messages.push(entry);
        }
      } catch {
        // skip
      }
    });

    rl.on("close", () => resolve(messages));
  });
}
