import { refreshInsights, getInsightsAge } from "./insights-cache";

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startInsightsScheduler(intervalMs: number = DEFAULT_INTERVAL_MS) {
  if (intervalId) return; // already running

  console.log(`[ZManager] Insights scheduler started (every ${Math.round(intervalMs / 60000)}min)`);

  // Run immediately if cache is stale or missing
  const age = getInsightsAge();
  if (age === null || age > intervalMs) {
    runAnalysis();
  }

  intervalId = setInterval(() => {
    runAnalysis();
  }, intervalMs);
}

export function stopInsightsScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[ZManager] Insights scheduler stopped");
  }
}

async function runAnalysis() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log("[ZManager] Running project analysis...");
    const result = await refreshInsights();
    console.log(`[ZManager] Analysis complete: ${result.insights.length} insights found`);
  } catch (err) {
    console.error("[ZManager] Analysis failed:", err);
  }
  isRunning = false;
}
