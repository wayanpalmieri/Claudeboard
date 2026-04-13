import { NextResponse } from "next/server";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import { resolveProjectBySlug } from "@/lib/project-resolver";
import { getCuratedFolder } from "@/lib/config";

// POSIX single-quote a string for safe interpolation into /bin/sh.
function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// Escape a string for inclusion inside an AppleScript double-quoted string.
function asEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Windows shell metacharacters that can break argument boundaries when shell=true.
const WIN_UNSAFE = /["<>|&^()%!]/;

export async function POST(request: Request) {
  const { slug, target } = await request.json();

  if (typeof slug !== "string" || typeof target !== "string") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const project = resolveProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectPath = project.path;
  const curated = getCuratedFolder();
  const curatedWithSep = curated.endsWith(path.sep) ? curated : curated + path.sep;
  const resolvedPath = path.resolve(projectPath);
  if (
    (resolvedPath !== curated && !resolvedPath.startsWith(curatedWithSep)) ||
    !fs.existsSync(resolvedPath)
  ) {
    return NextResponse.json({ error: "Invalid project path" }, { status: 403 });
  }

  const platform = os.platform(); // 'darwin' | 'win32' | 'linux'

  return new Promise<Response>((resolve) => {
    let cmd: string;
    let args: string[];
    let useShell = false;

    if (platform === "darwin") {
      // macOS
      switch (target) {
        case "vscode":
          cmd = "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code";
          args = ["--new-window", resolvedPath];
          break;
        case "terminal":
          cmd = "open";
          args = ["-a", "Terminal", resolvedPath];
          break;
        case "claude": {
          // Build shell command with POSIX-quoted path, then escape for AppleScript string.
          const shellCmd = `cd ${shQuote(resolvedPath)} && claude`;
          cmd = "osascript";
          args = [
            "-e", `tell application "Terminal" to activate`,
            "-e", `tell application "Terminal" to do script "${asEscape(shellCmd)}"`,
          ];
          break;
        }
        default:
          resolve(NextResponse.json({ error: "Invalid target" }, { status: 400 }));
          return;
      }
    } else if (platform === "win32") {
      // Windows: spawn with shell=true concatenates args via cmd.exe, so reject
      // any path containing shell metacharacters to prevent argument injection.
      if (WIN_UNSAFE.test(resolvedPath)) {
        resolve(NextResponse.json({ error: "Path contains unsafe characters" }, { status: 400 }));
        return;
      }
      switch (target) {
        case "vscode":
          cmd = "code";
          args = ["--new-window", resolvedPath];
          useShell = true; // need shell for PATH resolution of code.cmd
          break;
        case "terminal":
          cmd = "wt.exe";
          args = ["-d", resolvedPath];
          break;
        case "claude":
          cmd = "wt.exe";
          args = ["-d", resolvedPath, "cmd", "/k", "claude"];
          break;
        default:
          resolve(NextResponse.json({ error: "Invalid target" }, { status: 400 }));
          return;
      }
    } else {
      // Linux
      switch (target) {
        case "vscode":
          cmd = "code";
          args = ["--new-window", resolvedPath];
          useShell = true;
          break;
        case "terminal":
          cmd = "x-terminal-emulator";
          args = ["--working-directory", resolvedPath];
          break;
        case "claude":
          // Pass bash + -c + script as separate argv entries so projectPath is
          // only interpolated inside a POSIX-quoted literal.
          cmd = "x-terminal-emulator";
          args = [
            "-e", "bash", "-c",
            `cd ${shQuote(resolvedPath)} && claude; exec bash`,
          ];
          break;
        default:
          resolve(NextResponse.json({ error: "Invalid target" }, { status: 400 }));
          return;
      }
    }

    const child = spawn(cmd, args, { detached: true, stdio: "ignore", shell: useShell });

    child.on("error", (err) => {
      resolve(NextResponse.json({ error: String(err), platform, cmd }, { status: 500 }));
    });

    child.unref();

    setTimeout(() => {
      resolve(NextResponse.json({ success: true, platform }));
    }, 500);
  });
}
