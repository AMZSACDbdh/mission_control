/**
 * The journal: one written entry per calendar date.
 *
 * Pure by design — the shape, the empty entry, and the question "has anything
 * actually been written here?" all live outside React so they can be tested and
 * so the route file holds presentation only.
 */

export type JournalData = {
  reflection: string;
  lessons: string;
  gratitudes: string[];
  intention: string;
  notes: string;
  ideas: string[];
  weekly: string;
  monthly: string;
  /** 0: hollow, 1: calm, 2: productive, 3: energized. */
  mood: number;
};

export const DEFAULT_ENTRY: JournalData = {
  reflection: "",
  lessons: "",
  gratitudes: ["", "", ""],
  intention: "",
  notes: "",
  ideas: ["", "", ""],
  weekly: "",
  monthly: "",
  mood: 0,
};

/** A fresh entry, with its own arrays so edits cannot leak between dates. */
export function emptyEntry(): JournalData {
  return { ...DEFAULT_ENTRY, gratitudes: ["", "", ""], ideas: ["", "", ""] };
}

/**
 * The ledger ref for a day's journal. Keyed on the *entry's* date, so writing
 * about last Tuesday credits last Tuesday's entry exactly once, however many
 * times it is edited.
 */
export const journalRef = (date: string) => `journal:${date}`;

/**
 * Has anything actually been written?
 *
 * This is the condition for earning the journal's XP, so it deliberately
 * requires **writing**. Mood is a single tap; crediting it would be paying for
 * an interaction rather than for reflection, which §2.5 forbids — XP is for
 * completed work, never for touching the app.
 */
export function hasWritten(entry: JournalData | undefined): boolean {
  if (!entry) return false;

  const prose = [
    entry.reflection,
    entry.lessons,
    entry.intention,
    entry.notes,
    entry.weekly,
    entry.monthly,
  ];
  if (prose.some((text) => text.trim().length > 0)) return true;

  return [...entry.gratitudes, ...entry.ideas].some((line) => line.trim().length > 0);
}
