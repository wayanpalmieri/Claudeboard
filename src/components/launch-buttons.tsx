"use client";

import { useState } from "react";
import { Code, Terminal, Zap, Check, Loader2 } from "lucide-react";

export function LaunchButtons({ slug }: { slug: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleLaunch(target: string) {
    setLoading(target);
    setDone(null);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, target }),
      });
      if (res.ok) {
        setDone(target);
        setTimeout(() => setDone(null), 1500);
      }
    } catch {
      // silent
    }
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2">
      <LaunchBtn
        label="VS Code"
        icon={Code}
        color="#0a84ff"
        loading={loading === "vscode"}
        done={done === "vscode"}
        onClick={() => handleLaunch("vscode")}
      />
      <LaunchBtn
        label="Terminal"
        icon={Terminal}
        color="#30d158"
        loading={loading === "terminal"}
        done={done === "terminal"}
        onClick={() => handleLaunch("terminal")}
      />
      <LaunchBtn
        label="Claude"
        icon={Zap}
        color="#bf5af2"
        filled
        loading={loading === "claude"}
        done={done === "claude"}
        onClick={() => handleLaunch("claude")}
      />
    </div>
  );
}

function LaunchBtn({
  label,
  icon: Icon,
  color,
  filled,
  loading,
  done,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  filled?: boolean;
  loading: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group relative flex items-center gap-1.5 px-3.5 py-[7px] rounded-[9px] text-[13px] font-medium cursor-pointer transition-all duration-200 active:scale-[0.96] disabled:opacity-50 overflow-hidden whitespace-nowrap"
      style={{
        background: filled ? color : `${color}12`,
        color: filled ? "#fff" : color,
        boxShadow: filled ? `0 2px 12px ${color}30` : "none",
      }}
    >
      {/* Hover overlay */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: filled ? "rgba(255,255,255,0.12)" : `${color}08` }}
      />
      <span className="relative flex items-center gap-1.5">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        {label}
      </span>
    </button>
  );
}
