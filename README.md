# Claudeboard

A local dashboard for managing all your Claude Code projects from one interface. Built with Next.js, works on macOS, Windows, and Linux.

Mission control for Claude Code projects.

## What It Does

Claudeboard reads your `~/.claude/` data directory and surfaces everything in a unified dashboard — projects, sessions, activity, cost, automated insights, and one-click launches.

### Features

- **Dashboard** — Totals, activity chart, live sessions, recent projects at a glance
- **Projects** — Browse all projects grouped by category with search, sort, and filter
- **Session viewer** — Read full conversation history from any Claude Code session
- **Session resume** — Resume any past session in a new Claude terminal with one click (`claude --resume <sessionId>`)
- **Cost tracking** — Per-session, per-project, and dashboard-wide cost computed from JSONL token usage. Partial recovery from subagent logs when the primary session JSONL has been archived; archived sessions are clearly marked
- **⌘K / Ctrl+K command palette** — Fuzzy-jump to any project, page, or action. Run launches (Claude/VS Code/Terminal) without clicking. Platform-aware label (shows `⌘K` on macOS, `Ctrl+K` elsewhere)
- **Prompts library** — Save reusable prompts, launch any into any project via `claude "<prompt>"`. Stored locally in `claudeboard-prompts.json`
- **Git integration** — Per-project git status (branch, ahead/behind, uncommitted count), plus a clickable GitHub link on every repo with a detected `github.com` remote
- **GitHub visibility** — Green/amber indicator on the GitHub icon tells you which repos are public vs. private (or inaccessible). Uses anonymous `api.github.com`, cached server-side for 6 hours
- **Insights** — Automated analysis scans projects every 30 minutes for issues, suggestions, and opportunities
- **Search** — Search across all sessions and projects by title, prompt, or project name
- **Launch controls** — Open any project directly from the dashboard:
  - **VS Code** — Opens the project in a new VS Code window
  - **Terminal** — Opens a Terminal window at the project folder
  - **Claude** — Opens a Terminal window and starts a Claude Code session (optionally with `--resume <sessionId>` or with an inline prompt)
- **Settings** — Configure projects folder with a native OS folder picker, exclude directories

### Security posture

Claudeboard is designed to run on your own machine and nowhere else.

- **Loopback-only API** — A Next.js proxy (`src/proxy.ts`) rejects any `/api/*` request whose `Host` header isn't loopback, and any cross-origin `Origin`. Even if the Next dev server binds to `0.0.0.0`, other devices on the network can't hit your endpoints
- **Hardened launch endpoint** — Path and project validation; POSIX-quoted shell interpolation on macOS/Linux via a dedicated `shQuote` helper; Windows rejects paths and prompts containing shell metacharacters; session IDs pass a regex whitelist
- **Symlink-aware settings** — Changing the projects folder resolves via `realpath` then `lstat`s the canonical result to reject symlinks before persist (closes the lstat→realpath TOCTOU window)
- **Prototype-pollution reviver** — Shared `safeParse` helper (`src/lib/safe-json.ts`) strips `__proto__` / `constructor` / `prototype` keys on every JSON read from `~/.claude` or `process.cwd()`
- **Atomic writes** — `claudeboard-settings.json`, `claudeboard-prompts.json`, and `insights-cache.json` are written via a temp file + rename

### Data sources

All data is read directly from the filesystem — no database required.

| Source | Path | What It Provides |
|--------|------|------------------|
| Projects | `~/.claude/projects/` | Session logs, conversation history, token usage |
| Stats | `~/.claude/stats-cache.json` | Daily message/session counts |
| Sessions | `~/.claude/sessions/` | Active session detection (PID checking) |
| Todos | `~/.claude/todos/` | Task tracking per session |
| Plans | `~/.claude/plans/` | Implementation plans |
| History | `~/.claude/history.jsonl` | Prompt history |
| Git | Per-project git repo | Branch, dirty count, ahead/behind, origin remote |
| GitHub | `api.github.com` (anon) | Repo public/private visibility, cached 6h |

## Getting Started

### Prerequisites

- Node.js **20.9+** (Next.js 16 requirement)
- Claude Code installed (`~/.claude/` directory exists)
- **Editor (optional, for the VS Code launch button)** — VS Code is the default. The button will silently fail if it isn't installed:
  - **macOS**: expects `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`
  - **Linux/Windows**: expects `code` on `PATH`
  - **Using a different editor (Cursor, Windsurf, Zed, JetBrains…)?** Edit the `vscode` case in [`src/app/api/launch/route.ts`](src/app/api/launch/route.ts) and swap the command — e.g. `cursor`, `windsurf`, `zed`, or `idea` — for your tool. Terminal and Claude launches are editor-agnostic and work unchanged.

### Install

```bash
git clone https://github.com/wayanpalmieri/Claudeboard.git claudeboard
cd claudeboard
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first launch the app defaults to `~/Projects` as the projects folder. Open **Settings** and either paste a path or click **Browse** to open the native OS folder picker. Any folders under that directory will be discovered automatically.

### Optional environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLAUDE_DATA_DIR` | `~/.claude` | Override the Claude Code data directory |

## Tech Stack

- **Next.js 16** — App Router, API routes, server components, `proxy.ts` middleware
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Component primitives
- **SWR** — Client-side data fetching with revalidation
- **Recharts** — Activity charts
- **date-fns** — Date formatting

## Project Structure

```
src/
├── proxy.ts                              # Loopback-only /api guard (Next 16 renamed middleware → proxy)
├── app/
│   ├── page.tsx                          # Dashboard
│   ├── projects/                         # Project list + detail + session viewer
│   ├── prompts/                          # Prompts library page
│   ├── tasks/                            # Insights (automated analysis)
│   ├── search/                           # Cross-session search
│   ├── settings/                         # Configuration (with native folder picker)
│   └── api/
│       ├── projects/                     # Project + session endpoints
│       ├── active-sessions/              # Live session detection
│       ├── stats/                        # Activity + totals
│       ├── search/                       # Cross-session search
│       ├── insights/                     # Analyzer results
│       ├── tasks/                        # Todo aggregation
│       ├── launch/                       # Open project in VS Code / Terminal / Claude
│       ├── git/                          # Per-project git status + remote
│       ├── github-visibility/            # Public/private visibility (anon GitHub API)
│       ├── prompts/                      # Prompts library CRUD
│       └── settings/                     # App settings (+ /browse, /folders)
├── lib/
│   ├── config.ts                         # Paths, settings persistence (atomic writes)
│   ├── safe-json.ts                      # Prototype-pollution-safe JSON.parse
│   ├── pricing.ts                        # Model pricing + cost math
│   ├── project-resolver.ts               # Maps filesystem dirs to Claude data
│   ├── session-parser.ts                 # Parses JSONL + recovers archived cost
│   ├── claude-data.ts                    # Top-level data orchestrator + totals
│   ├── project-analyzer.ts               # Automated insight generation
│   ├── insights-scheduler.ts             # 30-minute analysis cron
│   ├── insights-cache.ts                 # Persistent insights cache
│   ├── active-session-monitor.ts         # PID-based session detection
│   ├── stats-reader.ts                   # Activity stats (cached + live)
│   ├── todo-aggregator.ts                # Task aggregation across projects
│   ├── plan-matcher.ts                   # Plan-to-project matching
│   ├── git-remote.ts                     # Read + canonicalize origin remote
│   ├── github-visibility.ts              # Public/private probe + 6h cache
│   └── prompts-store.ts                  # Prompts library persistence
├── components/
│   ├── layout/sidebar.tsx                # Navigation sidebar
│   ├── dashboard/activity-chart.tsx      # Activity area chart
│   ├── command-palette.tsx               # ⌘K / Ctrl+K global palette
│   ├── icons/github.tsx                  # GitHub logo + visibility-aware link
│   └── launch-buttons.tsx                # VS Code / Terminal / Claude launchers
├── hooks/
│   ├── use-api.ts                        # SWR hooks for all endpoints
│   └── use-platform.ts                   # Platform-aware keyboard shortcut label
├── types/project.ts                      # TypeScript interfaces
└── instrumentation.ts                    # Server startup (insights scheduler)
```

## API Endpoints

All endpoints are restricted to loopback by `src/proxy.ts`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects with metadata + cost totals |
| `/api/projects/[slug]` | GET | Project detail with sessions |
| `/api/projects/[slug]/sessions/[id]` | GET | Full conversation data |
| `/api/active-sessions` | GET | Currently running Claude sessions (PID-based) |
| `/api/stats` | GET | Activity data + totals |
| `/api/search?q=` | GET | Cross-session search (query capped at 200 chars) |
| `/api/insights` | GET | Automated project analysis (cached) |
| `/api/insights?refresh=1` | GET | Force fresh analysis |
| `/api/tasks` | GET | Aggregated todos across projects |
| `/api/launch` | POST | Open project in VS Code / Terminal / Claude. Accepts optional `sessionId` (for resume) or `promptText` (for canned prompts) |
| `/api/git` | GET | Per-project git status + GitHub remote URL |
| `/api/github-visibility` | GET | Per-project public/private visibility (6h server cache) |
| `/api/prompts` | GET/POST/DELETE | Prompts library CRUD |
| `/api/settings` | GET/PUT | Read/update app settings |
| `/api/settings/folders` | GET | List folders for exclusion config |
| `/api/settings/browse` | POST | Open native OS folder picker; returns chosen path |

## Cost Tracking

Token usage is read from `message.usage` entries in the JSONL files and costed against a per-model table in `src/lib/pricing.ts` (input, output, cache-read, cache-write rates for Opus/Sonnet/Haiku 4.x). Totals roll up to:

- **Dashboard** — Total cost across all projects
- **Project cards** — Per-project total (yellow cost pill)
- **Project detail** — "Total Cost" stat card
- **Session rows** — Per-session cost (`$X.XX`)

### Archived sessions

When a project's primary `<sessionId>.jsonl` has been deleted/archived but structural metadata remains, Claudeboard:

1. Falls back to the absolute `fullPath` recorded in `sessions-index.json`
2. If that's also gone, aggregates token usage from any surviving `<sessionId>/subagents/*.jsonl` files
3. Marks the session with an **archived** badge and appends `+` to the cost (`$X.XX+`) to signal partial data
4. Disables the Resume button for archived sessions (Claude CLI can't resume a missing JSONL)

## Insights Engine

The automated analyzer runs every 30 minutes and checks for:

- **Inactive projects** — Significant work history but no recent activity
- **Unresolved issues** — Last session title suggests debugging/bug work
- **Very large sessions** — Sessions with 500+ messages that may have lost context
- **Single-session projects** — Built once and never revisited
- **Short session patterns** — Frequent context switching across many small sessions
- **Missing files** — Projects without README.md or .gitignore
- **Healthy projects** — Active projects with strong momentum

Results are cached to `insights-cache.json` and served instantly between scans.

## Design

macOS-native dark theme following Apple Human Interface Guidelines:

- SF system font (`-apple-system`), layered dark surfaces
- Vibrancy blur with `backdrop-filter: blur(20px) saturate(180%)`
- 10px border radius, 0.5px borders
- Apple system colors — blue `#0a84ff`, green `#30d158`, purple `#bf5af2`, orange `#ff9f0a`, red `#ff453a`, yellow `#ffd60a` for cost
- Spring-based animations with `prefers-reduced-motion` support
- Grouped list rows, segmented controls, iOS-style toggles
- Color-coded project cards with category accent bars

## Configuration Files

All three are persisted next to the app and **gitignored**:

| File | Purpose | Written by |
|------|---------|------------|
| `claudeboard-settings.json` | Projects folder, excluded folders | Settings page |
| `claudeboard-prompts.json` | Saved prompt library | Prompts page |
| `insights-cache.json` | Last scheduled analyzer run | Insights scheduler |

Example `claudeboard-settings.json`:

```json
{
  "projectsFolder": "/path/to/your/projects",
  "excludedFolders": ["folder-to-hide", "another-one"]
}
```

You can edit these directly, but the Settings and Prompts pages are the primary way to modify them.

## License

Private — personal use.
