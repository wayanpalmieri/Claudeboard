import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSettings } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { projectsFolder } = getSettings();

  if (!fs.existsSync(projectsFolder)) {
    return NextResponse.json([]);
  }

  const entries = fs.readdirSync(projectsFolder, { withFileTypes: true });
  const folders = entries
    .filter(e => e.isDirectory() && !e.name.startsWith("."))
    .map(e => {
      const dirPath = path.join(projectsFolder, e.name);
      const subs = fs.readdirSync(dirPath, { withFileTypes: true });
      const hasProjectMarkers = subs.some(
        s => s.name === "package.json" || s.name === "app.py" || s.name === "index.html" || s.name === "requirements.txt"
      );
      const subdirs = subs.filter(s => s.isDirectory() && !s.name.startsWith(".")).length;
      return {
        name: e.name,
        isGroup: !hasProjectMarkers && subdirs >= 1,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(folders);
}
