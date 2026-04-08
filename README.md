# ZManager Code

A local dashboard for managing all your Claude Code projects from one interface. Built with Next.js, designed for macOS.

Designed for Claude Code Projects.

## What It Does

ZManager Code reads your `~/.claude/` data directory and surfaces everything in a unified dashboard — projects, sessions, activity, and automated insights.

### Features

- **Dashboard** — Stats, activity chart, active sessions, recent projects at a glance
- **Projects** — Browse all projects grouped by category with search, sort, and filter
- **Session Viewer** — Read full conversation history from any Claude Code session
- **Insights** — Automated analysis scans projects every 30 minutes for issues, suggestions, and opportunities
- **Search** — Search across all sessions and projects by title, prompt, or project name
- **Launch Controls** — Open any project in VS Code, Terminal, or Claude directly from the dashboard
- **Settings** — Configure projects folder, exclude specific directories

### Data Sources

All data is read directly from the filesystem — no database required.

| Source | Path | What It Provides |
|--------|------|------------------|
| Projects | `~/.claude/projects/` | Session logs, conversation history |
| Stats | `~/.claude/stats-cache.json` | Daily message/session counts |
| Sessions | `~/.claude/sessions/` | Active session detection (PID checking) |
| Todos | `~/.claude/todos/` | Task tracking per session |
| Plans | `~/.claude/plans/` | Implementation plans |
| History | `~/.claude/history.jsonl` | Prompt history |

## Getting Started

### Prerequisites

- Node.js 18+
- Claude Code installed (`~/.claude/` directory exists)

### Install

```bash
git clone <repo-url> ZManager_v1
cd ZManager_v1
npm install
```

### Configure

Create a `.env.local` file or use the Settings page after launching:

```env
CURATED_FOLDER=/path/to/your/claude-code-projects
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 16** — App Router, API routes, server components
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Component primitives
- **SWR** — Client-side data fetching with revalidation
- **Recharts** — Activity charts
- **date-fns** — Date formatting

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard
│   ├── projects/                         # Project list + detail + session viewer
│   ├── tasks/                            # Insights (automated analysis)
│   ├── search/                           # Cross-session search
│   ├── settings/                         # Configuration
│   └── api/                              # REST endpoints
├── lib/
│   ├── config.ts                         # Paths, settings persistence
│   ├── project-resolver.ts               # Maps filesystem dirs to Claude data
│   ├── session-parser.ts                 # Parses JSONL conversation files
│   ├── claude-data.ts                    # Top-level data orchestrator
│   ├── project-analyzer.ts               # Automated insight generation
│   ├── insights-scheduler.ts             # 30-minute analysis cron
│   ├── insights-cache.ts                 # Persistent insights cache
│   ├── active-session-monitor.ts         # PID-based session detection
│   ├── stats-reader.ts                   # Activity stats (cached + live)
│   ├── todo-aggregator.ts                # Task aggregation across projects
│   └── plan-matcher.ts                   # Plan-to-project matching
├── components/
│   ├── layout/sidebar.tsx                # Navigation sidebar
│   ├── dashboard/activity-chart.tsx      # Activity area chart
│   └── launch-buttons.tsx                # VS Code / Terminal / Claude launchers
├── hooks/use-api.ts                      # SWR hooks for all endpoints
├── types/project.ts                      # TypeScript interfaces
└── instrumentation.ts                    # Server startup (insights scheduler)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects with metadata |
| `/api/projects/[slug]` | GET | Project detail with sessions |
| `/api/projects/[slug]/sessions/[id]` | GET | Full conversation data |
| `/api/insights` | GET | Automated project analysis (cached) |
| `/api/insights?refresh=1` | GET | Force fresh analysis |
| `/api/stats` | GET | Activity data + totals |
| `/api/active-sessions` | GET | Currently running Claude sessions |
| `/api/search?q=` | GET | Cross-session search |
| `/api/launch` | POST | Open project in VS Code / Terminal / Claude |
| `/api/settings` | GET/PUT | Read/update app settings |
| `/api/settings/folders` | GET | List folders for exclusion config |

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
- Apple system colors — blue `#0a84ff`, green `#30d158`, purple `#bf5af2`, orange `#ff9f0a`, red `#ff453a`
- Spring-based animations with `prefers-reduced-motion` support
- Grouped list rows, segmented controls, iOS-style toggles
- Color-coded project cards with category accent bars

## Configuration

Settings are persisted in `zmanager-settings.json` at the project root:

```json
{
  "projectsFolder": "/path/to/your/projects",
  "excludedFolders": ["folder-to-hide", "another-one"]
}
```

You can edit this directly or use the Settings page in the app.

## License

Private — personal use.
