export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInsightsScheduler } = await import("./lib/insights-scheduler");
    startInsightsScheduler();
  }
}
