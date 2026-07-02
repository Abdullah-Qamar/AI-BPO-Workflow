import type { WorkspaceStatus } from "@/lib/seed";

const COLORS: Record<WorkspaceStatus, string> = {
  active: "var(--dot-active)",
  failed: "var(--dot-failed)",
  complete: "var(--dot-complete)",
};

export function StatusDot({
  status,
  size = 6,
}: {
  status: WorkspaceStatus;
  size?: number;
}) {
  return (
    <span
      className="inline-block shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        background: COLORS[status],
      }}
    />
  );
}
