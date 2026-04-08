import fs from "fs";
import path from "path";
import { analyzeProjects, type Insight } from "./project-analyzer";

const CACHE_PATH = path.join(process.cwd(), "insights-cache.json");

interface InsightsCache {
  lastRun: string;
  insights: Insight[];
}

export function getCachedInsights(): InsightsCache | null {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
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
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  return cache;
}

export function getInsightsAge(): number | null {
  const cache = getCachedInsights();
  if (!cache) return null;
  return Date.now() - new Date(cache.lastRun).getTime();
}
