"use client";

/* Intake queue — the honest arrival model.
 *
 * A dropped file is anonymous. The only things the browser hands you are a
 * filename, a size and a MIME type; the institution, the account number and
 * whether it is a statement or a ledger are all *findings*, produced by
 * opening the document.
 *
 * The first pass violated that: rows appeared already carrying a bank logo,
 * account number and column assignment the moment the drop landed, because the
 * arrival loop iterated the seed rather than the files. That made intake's
 * headline output ("every statement matched to a ledger") a restatement of
 * something the canvas had already asserted seconds earlier.
 *
 * Here the queue holds documents that know nothing about themselves except
 * what the OS provided. `bankId` and `side` exist on the record because this is
 * a prototype and something has to stand in for OCR — but nothing may read them
 * until the doc has passed through `reading`, which is why they are nested
 * under `truth` rather than sitting on the doc as ordinary fields. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PropertyBank } from "@/lib/seed";
import type { Side } from "./hub";

export interface IncomingDoc {
  id: string;
  /* Everything below this line is known at drop time. */
  filename: string;
  sizeLabel: string;
  kind: "pdf" | "csv";
  /* Everything below this line is a finding. Off limits until `reading` ends. */
  truth: {
    bankId: string;
    side: Side;
  };
}

/* Deliberately unsorted, and deliberately not one-bank-at-a-time: a real folder
 * drop arrives in whatever order the filesystem yields. The first document is a
 * ledger whose statement has not landed yet, which is the case the shared
 * reducer silently drops — see the buffer in `useIntakeQueue`.
 *
 * Filenames are a mix of descriptive and useless on purpose. A name like
 * `document (4).pdf` cannot be classified without opening it, which is the
 * whole point: intake reads contents, it does not trust labels. */
/* The documents a session receives, built from the accounts it actually has.
 *
 * This was a fixed list of eight, hardcoded to four account ids that no longer
 * exist anywhere — the seed's accounts became per-property `bm-*` ids and this
 * list kept pointing at the old `bank-chase-op` family. Every document therefore
 * docked to an account no session owned, the reducer dropped every one of them,
 * and the intake ran to completion while the workspace sat on "awaiting
 * documents" forever. It was broken for every property, not just the ones with
 * a different number of accounts.
 *
 * Two documents per account, and the order is deliberately not paired: a ledger
 * can land before its own statement, which is the case `makeDockBuffer` exists
 * to hold. Interleaving the two halves is what exercises it. */
function docFor(
  bank: PropertyBank,
  side: Side,
  cycle: string,
  i: number
): IncomingDoc {
  const [mon, year] = cycle.split(" ");
  const slug = bank.id.replace(/^bm-/, "");
  const stamp = `${mon.toLowerCase()}${String(year).slice(2)}`;
  /* Deterministic, so a document does not change size between renders. */
  const sizes = ["1.2 MB", "743 KB", "2.1 MB", "892 KB", "1.6 MB", "3.4 MB"];
  return {
    id: `${slug}-${side}`,
    filename:
      side === "statement"
        ? `${slug}_${stamp}.pdf`
        : `yardi_${slug}_${stamp}.csv`,
    sizeLabel: sizes[(slug.length + i) % sizes.length],
    kind: side === "statement" ? "pdf" : "csv",
    truth: { bankId: bank.id, side },
  };
}

export function incomingFor(
  banks: PropertyBank[],
  cycle: string
): IncomingDoc[] {
  const statements = banks.map((b, i) => docFor(b, "statement", cycle, i));
  const ledgers = banks.map((b, i) => docFor(b, "ledger", cycle, i + 3));
  /* Ledgers first for the odd accounts, statements first for the even ones, so
   * the arrival order is genuinely mixed rather than all of one then all of the
   * other. */
  const out: IncomingDoc[] = [];
  banks.forEach((_, i) => {
    out.push(i % 2 === 0 ? ledgers[i] : statements[i]);
  });
  banks.forEach((_, i) => {
    out.push(i % 2 === 0 ? statements[i] : ledgers[i]);
  });
  return out;
}

/* Time spent with the document open before its identity is known, and the beat
 * the resolved identity is held at the core before the row flies out to its
 * side. The hold is what makes the assignment legible — without it the card
 * would resolve and vanish in the same frame.
 *
 * Slowed from 420/220. At the original cadence a document was replaced every
 * ~640ms while its row simultaneously animated in on the far side, and the two
 * events blurred into each other. ~800ms per document lets the read and the
 * placement register as two separate beats. */
const READ_MS = 520;
const HOLD_MS = 280;

export type QueueStage = "idle" | "reading" | "resolved" | "done";

export interface IntakeQueue {
  /* Documents not yet opened, in arrival order. */
  pending: IncomingDoc[];
  /* The document currently under the reader, if any. */
  current: IncomingDoc | null;
  /* `reading` hides `current.truth`; `resolved` permits it. */
  stage: QueueStage;
  identified: number;
  total: number;
  started: boolean;
  start: () => void;
}

export function useIntakeQueue({
  docs,
  onDock,
}: {
  /* The session's own documents — see `incomingFor`. */
  docs: IncomingDoc[];
  /* Fired once a document's identity is settled and it has left the core. */
  onDock: (bankId: string, side: Side) => void;
}): IntakeQueue {
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [stage, setStage] = useState<QueueStage>("idle");

  const onDockRef = useRef(onDock);
  onDockRef.current = onDock;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    if (!started) return;
    if (cursor >= docs.length) {
      setStage("done");
      return;
    }
    setStage("reading");
    timer.current = setTimeout(() => {
      setStage("resolved");
      timer.current = setTimeout(() => {
        const doc = docs[cursor];
        onDockRef.current(doc.truth.bankId, doc.truth.side);
        setCursor((c) => c + 1);
      }, HOLD_MS);
    }, READ_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [started, cursor, docs]);

  const start = useCallback(() => setStarted(true), []);

  return {
    pending: docs.slice(cursor + 1),
    current: cursor < docs.length ? docs[cursor] : null,
    stage,
    identified: cursor,
    total: docs.length,
    started,
    start,
  };
}

/* Docking order guard.
 *
 * `uploadLedger` is a no-op unless the bank already holds a statement, so a
 * ledger that resolves first would be silently swallowed. This buffers those
 * until their statement lands, then flushes them. */
export function makeDockBuffer(
  uploadStatement: (bankId: string) => void,
  uploadLedger: (bankId: string) => void
) {
  const statementsIn = new Set<string>();
  const ledgersWaiting = new Set<string>();
  return (bankId: string, side: Side) => {
    if (side === "statement") {
      statementsIn.add(bankId);
      uploadStatement(bankId);
      if (ledgersWaiting.has(bankId)) {
        ledgersWaiting.delete(bankId);
        uploadLedger(bankId);
      }
      return;
    }
    if (statementsIn.has(bankId)) {
      uploadLedger(bankId);
      return;
    }
    ledgersWaiting.add(bankId);
  };
}
