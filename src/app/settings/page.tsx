"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Check, AlertCircle, HardDrive, EyeOff, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Settings {
  projectsFolder: string;
  excludedFolders: string[];
}

interface FolderEntry {
  name: string;
  isGroup: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ projectsFolder: "", excludedFolders: [] });
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/settings/folders").then(r => r.json()).catch(() => []),
    ]).then(([settingsData, foldersData]) => {
      setSettings(settingsData);
      setFolders(foldersData);
      setLoading(false);
    });
  }, []);

  async function handleSaveFolder() {
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectsFolder: settings.projectsFolder }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setSettings(data);
      setSaved(true);
      // Refresh folder list for new path
      fetch("/api/settings/folders").then(r => r.json()).then(setFolders).catch(() => {});
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function toggleExclude(folderName: string) {
    const current = settings.excludedFolders;
    const updated = current.includes(folderName)
      ? current.filter(f => f !== folderName)
      : [...current, folderName];

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludedFolders: updated }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
    }
  }

  const excluded = new Set(settings.excludedFolders.map(f => f.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-[700px]">
      <div className="animate-in">
        <h1 className="text-[22px] font-semibold text-white/95 tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#98989d] mt-0.5">Configure your ZManager Code preferences</p>
      </div>

      {/* Projects Location */}
      <div className="animate-in" style={{ animationDelay: "50ms" }}>
        <p className="section-header">Projects Location</p>
        <div className="overflow-hidden rounded-[10px]">
          <div className="bg-[rgba(44,44,46,0.72)] backdrop-blur-xl border-[0.5px] border-white/[0.06] p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-[#0a84ff]/15 flex items-center justify-center shrink-0 mt-0.5">
                <HardDrive className="h-4.5 w-4.5 text-[#0a84ff]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/90">Root directory</p>
                <p className="text-[12px] text-[#636366] mt-0.5 leading-relaxed">
                  The folder that contains all your Claude Code project folders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#48484a]" />
                {loading ? (
                  <div className="h-[34px] shimmer rounded-lg" />
                ) : (
                  <Input
                    value={settings.projectsFolder}
                    onChange={(e) => { setSettings(s => ({ ...s, projectsFolder: e.target.value })); setSaved(false); setError(null); }}
                    placeholder="/path/to/your/projects"
                    className="pl-9 h-[34px] bg-white/[0.05] border-white/[0.06] text-[13px] text-white/80 placeholder:text-[#48484a] font-mono focus:border-[#0a84ff]/50 rounded-lg"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveFolder}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-[13px] font-medium text-white bg-[#0a84ff] hover:bg-[#409cff] active:bg-[#0060c0] active:scale-[0.97] transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm shadow-[#0a84ff]/20"
              >
                {saved ? <Check className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-[12px] text-[#ff453a]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            {saved && (
              <p className="text-[12px] text-[#30d158] mt-3 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Saved. Refresh Projects to see changes.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Excluded Folders */}
      <div className="animate-in" style={{ animationDelay: "100ms" }}>
        <p className="section-header">Visible Folders</p>
        <p className="text-[12px] text-[#636366] mb-2 px-1">Toggle folders to show or hide them from the dashboard.</p>

        {loading ? (
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 shimmer" />)}</div>
        ) : folders.length === 0 ? (
          <p className="text-[13px] text-[#48484a] px-1">No folders found at the configured path.</p>
        ) : (
          <div className="overflow-hidden rounded-[10px]">
            {folders.map((f, i) => {
              const isExcluded = excluded.has(f.name.toLowerCase());
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => toggleExclude(f.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-[rgba(58,58,60,0.72)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl ${
                    i < folders.length - 1 ? "border-b-[0.5px] border-white/[0.04]" : ""
                  } ${i === 0 ? "rounded-t-[10px]" : ""} ${i === folders.length - 1 ? "rounded-b-[10px]" : ""}`}
                >
                  {/* Toggle indicator */}
                  <div className={`h-[22px] w-[40px] rounded-full p-[2px] transition-colors duration-200 ${isExcluded ? "bg-[#38383a]" : "bg-[#30d158]"}`}>
                    <div className={`h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${isExcluded ? "translate-x-0" : "translate-x-[18px]"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`text-[13px] font-medium transition-colors ${isExcluded ? "text-[#48484a]" : "text-white/90"}`}>
                      {f.name}
                    </span>
                    {f.isGroup && (
                      <span className="text-[10px] text-[#636366] ml-2">Group</span>
                    )}
                  </div>

                  {isExcluded ? (
                    <EyeOff className="h-3.5 w-3.5 text-[#48484a] shrink-0" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-[#636366] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* About */}
      <div className="animate-in" style={{ animationDelay: "150ms" }}>
        <p className="section-header">About</p>
        <div className="overflow-hidden rounded-[10px]">
          <div className="bg-[rgba(44,44,46,0.72)] backdrop-blur-xl border-[0.5px] border-white/[0.06]">
            {[
              { label: "Version", value: "1.0.0" },
              { label: "Claude Data", value: "~/.claude" },
              { label: "Framework", value: "Next.js + React" },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b-[0.5px] border-white/[0.04]" : ""}`}>
                <span className="text-[13px] text-white/70">{item.label}</span>
                <span className="text-[13px] text-[#98989d] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
