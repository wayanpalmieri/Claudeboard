import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/config";
import { clearProjectCache } from "@/lib/project-resolver";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(request: Request) {
  const body = await request.json();

  if (body.projectsFolder) {
    if (typeof body.projectsFolder !== "string") {
      return NextResponse.json({ error: "Invalid projectsFolder" }, { status: 400 });
    }
    // Resolve any symlinks up-front, then lstat the canonical result. Doing
    // realpath first and validating the same resolved path we persist closes
    // the TOCTOU window between "I checked a symlink" and "I saved a path".
    let resolved: string;
    try {
      resolved = fs.realpathSync(body.projectsFolder);
    } catch {
      return NextResponse.json({ error: "Directory does not exist" }, { status: 400 });
    }
    let lstat;
    try {
      lstat = fs.lstatSync(resolved);
    } catch {
      return NextResponse.json({ error: "Directory does not exist" }, { status: 400 });
    }
    // realpath should have resolved all links; a symlink here means a race.
    if (lstat.isSymbolicLink() || !lstat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }
    body.projectsFolder = resolved;
  }

  saveSettings(body);
  clearProjectCache();
  return NextResponse.json(getSettings());
}
