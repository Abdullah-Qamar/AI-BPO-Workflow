"use client";

/* Hints — the app's own tooltip, applied by attribute rather than by wrapper.
 *
 * There were 38 native `title` attributes across the product. The browser draws
 * those itself: a black box, in the OS font, after a delay it owns, positioned
 * where it likes. On a light product with its own type and its own surfaces,
 * that is a foreign object — and it was the only black surface in the app.
 *
 * Wrapping all 38 in a component was the obvious fix and the wrong one: most of
 * them sit on spans inside grids, where introducing a wrapper changes the
 * layout around them. So the mechanism is an attribute — `data-hint="…"` — and
 * ONE listener at the root that watches for a pointer entering anything
 * carrying it. Nothing about the element it decorates changes.
 *
 * `data-hint-side` picks an edge ("top" is the default). Set it where the
 * default would run off-screen; the layer also flips a hint that would overflow
 * the viewport horizontally, but it will not guess a better vertical side for
 * you.
 *
 * Keyboard users get the same hint on focus, which the native `title` never
 * reliably gave them.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Side = "top" | "bottom" | "left" | "right";

interface HintState {
  text: string;
  side: Side;
  /* Viewport coordinates of the element being described. */
  rect: DOMRect;
  /* The element itself, so the hint can tell when what it describes has gone.
   * Clicking a row that navigates leaves the pointer stationary over a screen
   * that no longer contains the thing being described, and no pointer event
   * fires to say so — the hint would sit there describing nothing. */
  el: HTMLElement;
}

const OPEN_DELAY_MS = 260;
const GAP = 8;

export function HintLayer() {
  const [hint, setHint] = useState<HintState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHint(null);
    setPos(null);
  }, []);

  useEffect(() => {
    const targetFor = (e: Event): HTMLElement | null => {
      const el = e.target as HTMLElement | null;
      return el?.closest?.("[data-hint]") ?? null;
    };

    const open = (el: HTMLElement) => {
      const text = el.getAttribute("data-hint");
      if (!text) return;
      const side = (el.getAttribute("data-hint-side") as Side) || "top";
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(
        () => setHint({ text, side, rect: el.getBoundingClientRect(), el }),
        OPEN_DELAY_MS
      );
    };

    const onOver = (e: PointerEvent) => {
      const el = targetFor(e);
      if (el) open(el);
      else cancel();
    };
    const onFocus = (e: FocusEvent) => {
      const el = targetFor(e);
      if (el) open(el);
    };
    /* Anything that moves the page invalidates a measured position, and a hint
     * left floating beside where its element used to be is worse than none. */
    const onLeave = () => cancel();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerdown", onLeave, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onLeave, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onLeave, true);
    window.addEventListener("resize", onLeave);
    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerdown", onLeave, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onLeave, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onLeave, true);
      window.removeEventListener("resize", onLeave);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cancel]);

  /* A hint outlives its element when the screen changes under a stationary
   * pointer. Nothing in the DOM announces that, so it is polled — cheaply, and
   * only while a hint is actually open. */
  useEffect(() => {
    if (!hint) return;
    const id = setInterval(() => {
      if (!hint.el.isConnected) cancel();
    }, 400);
    return () => clearInterval(id);
  }, [hint, cancel]);

  /* Measured after mount, because the card's own size decides where it can go.
   * Rendering it off-screen first and then placing it avoids the one-frame
   * jump you get from guessing. */
  useEffect(() => {
    if (!hint || !cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const r = hint.rect;
    let left: number;
    let top: number;
    switch (hint.side) {
      case "bottom":
        left = r.left + r.width / 2 - card.width / 2;
        top = r.bottom + GAP;
        break;
      case "left":
        left = r.left - card.width - GAP;
        top = r.top + r.height / 2 - card.height / 2;
        break;
      case "right":
        left = r.right + GAP;
        top = r.top + r.height / 2 - card.height / 2;
        break;
      default:
        left = r.left + r.width / 2 - card.width / 2;
        top = r.top - card.height - GAP;
    }
    /* Keep it on screen. A hint clipped by the viewport edge is a hint that
     * cannot be read. */
    left = Math.max(8, Math.min(left, window.innerWidth - card.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - card.height - 8));
    setPos({ left, top });
  }, [hint]);

  if (!hint) return null;

  return (
    <div
      ref={cardRef}
      role="tooltip"
      className="glass t-body"
      style={{
        position: "fixed",
        zIndex: 200,
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        /* Hidden until measured, rather than flashing at the wrong place. */
        opacity: pos ? 1 : 0,
        maxWidth: 320,
        padding: "6px 10px",
        borderRadius: "var(--radius-sheet)",
        color: "var(--ink-primary)",
        /* Multi-line where the text needs it — several of these hints are a
         * sentence, and the native tooltip's single line truncated them. */
        whiteSpace: "pre-line",
        pointerEvents: "none",
        transition: "opacity 120ms ease",
      }}
    >
      {hint.text}
    </div>
  );
}
