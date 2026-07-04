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
        /* Sticky so the rail is anchored to the viewport as the canvas scrolls
         * underneath. alignSelf keeps it from stretching in the flex row. */
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        zIndex: 20,
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
                // Root is now the light --bg-grad (unified with the workspace
                // canvas). Both states use the same slate tone; the chip
                // background on the active button carries the selection cue.
                color: active ? "#303B45" : "#7C8C9A",
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
