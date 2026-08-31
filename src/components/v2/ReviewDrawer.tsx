"use client";

/* ReviewDrawer — review is a drawer, not a canvas swap.
 *
 * It slides in from the right at 16px narrower than the workspace, so a sliver
 * of the hub stays visible along the left edge. The hub keeps its own state
 * untouched underneath, which is what makes going back free: no re-orientation,
 * no reload, no lost scroll position.
 *
 * The record surface itself is the shared ReviewCanvas. V2's complaint was
 * about the transition and the competing right-hand panel, not about the
 * record list — and in a 3-column shell there is no panel left to compete.
 * The canvas carries the "Post to Yardi" CTA while the session is in review;
 * posting closes the drawer, and the hub underneath plays the outward flow. */

import { useEffect, useState } from "react";
import { ReviewCanvas } from "@/components/ReviewCanvas";

const SLIDE_MS = 320;

export function ReviewDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* `mounted` outlives `open` for the length of the slide-out so the drawer
   * can animate away instead of vanishing. */
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-label="Review records"
      className="flex flex-col"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 16,
        background: "var(--bg-grad)",
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        boxShadow: "-24px 0 64px -18px rgba(37,49,63,0.34)",
        overflow: "hidden",
        transform: shown ? "translateX(0)" : "translateX(100%)",
        transition: `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        zIndex: 30,
      }}
    >
      <ReviewCanvas onBack={onClose} />
    </div>
  );
}
