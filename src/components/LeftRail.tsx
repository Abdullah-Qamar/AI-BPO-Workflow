"use client";

import Image from "next/image";
import { Files, House, LayoutDashboard } from "lucide-react";
import type { ComponentType } from "react";
import { Tooltip } from "./ui/Tooltip";

type Route = "dashboard" | "workspace" | "properties";

interface IconProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const ITEMS: {
  key: Route;
  icon: ComponentType<IconProps>;
  label: string;
}[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "workspace", icon: Files, label: "Reconciliation" },
  { key: "properties", icon: House, label: "Properties" },
];

export function LeftRail({
  route,
  onNavigate,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
}) {
  return (
    <aside
      className="flex flex-col items-start shrink-0"
      style={{
        width: 80,
        padding: "28px 20px",
        gap: 16,
        borderRight: "1px solid var(--line)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: 40, height: 40, padding: 4 }}
      >
        <Image
          src="/logo.png"
          width={32}
          height={32}
          alt="App"
          priority
          style={{ display: "block", borderRadius: 7 }}
        />
      </div>

      {ITEMS.map((item) => {
        const active = route === item.key;
        const Icon = item.icon;
        return (
          <Tooltip
            key={item.key}
            label={item.label}
            side="right"
            tone={active ? "info" : "neutral"}
          >
            <button
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.key)}
              className="flex items-center justify-center transition"
              style={{
                width: 36,
                height: 36,
                padding: 8,
                borderRadius: 8,
                background: active ? "var(--surface-chip)" : "transparent",
                border: active ? "1px solid #FFFFFF" : "1px solid transparent",
                // Spec for the selected button is bg + border only — no shadow.
                boxShadow: "none",
                // Unselected icons are spec'd as white (they sit on the cool
                // grey-blue root). Selected icon is slate to read on the lifted
                // light chip.
                color: active ? "#7C8C9A" : "#FFFFFF",
                cursor: "pointer",
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </button>
          </Tooltip>
        );
      })}
    </aside>
  );
}
