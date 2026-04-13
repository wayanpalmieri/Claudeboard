import fs from "fs";
import path from "path";
import { analyzeProjects, type Insight } from "./project-analyzer";
import { safeParse } from "./safe-json";

const CACHE_PATH = path.join(process.cwd(), "insights-cache.json");

interface InsightsCache {
  lastRun: string;
  insights: Insight[];
}

export function getCachedInsights(): InsightsCache | null {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return safeParse<InsightsCache>(fs.readFileSync(CACHE_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return null;
}

export async function refreshInsights(): Promise<InsightsCache> {
  const insights = await analyzeProjects();
  const cache: InsightsCache = {
    lastRun: new Date().toISOString(),
    insights,
  };
  // Atomic write so a crash mid-write can't leave a half-written cache file.
  const tmp = `${CACHE_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, CACHE_PATH);
  return cache;
}

export function getInsightsAge(): number | null {
  const cache = getCachedInsights();
  if (!cache) return null;
  return Date.now() - new Date(cache.lastRun).getTime();
}
