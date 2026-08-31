/* Property knowledge — notes scoped to one property, not the whole portfolio.
 *
 * This is a different thing from the global rule library in the left rail. A
 * global rule ("a fee under $50 with no counterpart is immaterial") is true
 * everywhere. These are local facts a human knows and the agent cannot infer:
 * how this landlord's name is printed, which recurring charge has no Yardi
 * counterpart, when a particular account's interest actually posts.
 *
 * They belong in the workspace header because they are part of the session's
 * standing context — true before the run starts and still true after it ends —
 * rather than something an agent produces during it.
 *
 * `hits` is the observability half: a note that never fires is either wrong or
 * obsolete, and one firing constantly is a candidate to be promoted into a
 * portfolio-wide rule. */

export type NoteKind = "identity" | "exclusion" | "timing";

export interface PropertyNote {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  /* Which accounts it constrains. Null means every bank on the property. */
  appliesTo: string | null;
  addedBy: string;
  addedOn: string;
  /* Times the agents applied it during the current cycle. */
  hits: number;
  /* Added after the run that produced `hits` — so zero hits is "has not had the
   * chance yet", not "stale". Without this an instruction written on the summary
   * screen is immediately accused of never firing. */
  pending?: boolean;
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  identity: "Identity",
  exclusion: "Exclusion",
  timing: "Timing",
};

export const propertyNotes: PropertyNote[] = [
  {
    id: "note-suite-line",
    kind: "identity",
    title: "Ignore the suite line in the statement address",
    body:
      "Chase prints the mailing address as “1849 Westlake Ave N STE 200”. The suite " +
      "belongs to the management office, not the property. Treat it as the same " +
      "address as the Yardi record, which carries no suite.",
    appliesTo: "Chase Operating, Chase Escrow",
    addedBy: "R. Okafor",
    addedOn: "Mar 2026",
    hits: 4,
  },
  {
    id: "note-dba",
    kind: "identity",
    title: "Account holder is the LLC, not the DBA",
    body:
      "Bank of America statements list the holder as “Tahoe Holdings LLC” with no " +
      "DBA, while Yardi carries “Tahoe Holdings LLC dba 1849 Westlake”. Same entity, " +
      "do not raise a holder mismatch.",
    appliesTo: "BoA Reserves",
    addedBy: "R. Okafor",
    addedOn: "Mar 2026",
    hits: 2,
  },
  {
    id: "note-analysis-fee",
    kind: "exclusion",
    title: "Monthly account analysis fee has no ledger counterpart",
    body:
      "BoA charges a $42.50 analysis fee that the property books quarterly, not " +
      "monthly. In the two intervening months it will have no matching Yardi entry. " +
      "Carry it rather than flagging it.",
    appliesTo: "BoA Reserves",
    addedBy: "D. Mensah",
    addedOn: "Jan 2026",
    hits: 1,
  },
  {
    id: "note-escrow-interest",
    kind: "timing",
    title: "Escrow interest posts after cycle close",
    body:
      "Interest on the escrow account settles on the 3rd of the following month, so " +
      "it lands two to three days outside the cycle. Match it to the prior period " +
      "instead of treating it as an unexplained deposit.",
    appliesTo: "Chase Escrow",
    addedBy: "D. Mensah",
    addedOn: "Nov 2025",
    hits: 3,
  },
];

export const notesAppliedThisCycle = propertyNotes.reduce(
  (n, note) => n + note.hits,
  0
);
