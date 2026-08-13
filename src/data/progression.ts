/**
 * The Progression Engine — XP curve, Levels, Master Ranks and Journeys.
 *
 * Implements docs/03_PROGRESSION_ENGINE.md Parts 1, 2 and 4.
 * The XP curve is frozen by docs/decisions/ADR-006-journey-xp-curve.md.
 *
 * This module is pure and deterministic. It owns no state, stores nothing, and
 * given the same lifetime XP will always return the same answer. Everything
 * here is derived; nothing is ever persisted.
 */

/* ------------------------------------------------------------------ *
 * The XP curve
 * ------------------------------------------------------------------ */

/**
 * Milestone costs — the XP required to advance *from* that level to the next.
 * Between milestones the curve interpolates smoothly: no sudden jumps, no
 * cliffs.
 *
 * The cost of a level rises **linearly**, 1,000 at level 1 to 3,400 at level
 * 99, summing to exactly 218,000 XP per Journey.
 *
 * *Why linear, and why this total:* the original milestone table (1,000 →
 * 18,000, JOURNEY_XP 772,300) contradicted the specification's own stated
 * duration. Against a measured economy of ~450 XP on a realistic day and ~800
 * on a strong one — 164,000–290,000 XP/year — it priced a Journey at 2.6–4.7
 * years, not the promised one. 218,000 sits at the centre of that measured
 * band, so a Journey lands near a year at an ordinary pace.
 *
 * Linearity is what makes the two endpoints and the total mutually consistent:
 * the mean level cost is (1,000 + 3,400) / 2 = 2,200, and 2,200 × 99 levels is
 * the whole Journey. Levels still slow down as you climb — the last costs 3.4×
 * the first — but the deceleration is gentle enough that late levels never
 * become a wall. See docs/decisions/ADR-006-journey-xp-curve.md.
 *
 * Changing these numbers moves every Journey boundary ever recorded, and
 * Chronicles are immutable. Do not touch without an ADR superseding 006.
 */
const CURVE_MILESTONES: [level: number, xpToNext: number][] = [
  [1, 1_000],
  [10, 1_220],
  [20, 1_470],
  [30, 1_710],
  [40, 1_960],
  [50, 2_200],
  [60, 2_450],
  [70, 2_690],
  [80, 2_940],
  [90, 3_180],
  [99, 3_400],
];

export const JOURNEY_LEVELS = 100;

/** Cost to advance from `level` to `level + 1`. Linear between milestones. */
export function xpToNextLevel(level: number): number {
  const clamped = Math.min(Math.max(1, Math.floor(level)), JOURNEY_LEVELS - 1);

  for (let i = 0; i < CURVE_MILESTONES.length - 1; i += 1) {
    const [lowLevel, lowXp] = CURVE_MILESTONES[i]!;
    const [highLevel, highXp] = CURVE_MILESTONES[i + 1]!;

    if (clamped >= lowLevel && clamped <= highLevel) {
      if (clamped === lowLevel) return lowXp;
      if (clamped === highLevel) return highXp;
      const t = (clamped - lowLevel) / (highLevel - lowLevel);
      return Math.round(lowXp + (highXp - lowXp) * t);
    }
  }

  return CURVE_MILESTONES[CURVE_MILESTONES.length - 1]![1];
}

/**
 * Cumulative XP needed to *reach* a level within a Journey. Level 1 costs
 * nothing; reaching level 100 costs the whole Journey.
 *
 * Built once at module load — the spec permits caching the XP table, and
 * forbids only caching derived progression values.
 */
const CUMULATIVE: number[] = (() => {
  const table = [0, 0]; // index 0 unused; level 1 costs 0
  for (let level = 1; level < JOURNEY_LEVELS; level += 1) {
    table[level + 1] = table[level]! + xpToNextLevel(level);
  }
  return table;
})();

/** Total XP contained in one complete Journey (level 1 → 100). */
export const JOURNEY_XP = CUMULATIVE[JOURNEY_LEVELS]!;

/* ------------------------------------------------------------------ *
 * Master Ranks — ten bands of ten levels
 * ------------------------------------------------------------------ */

export type MasterRank = {
  /** 1–10, the chapter number within a Journey. */
  chapter: number;
  kanji: string;
  name: string;
  meaning: string;
  theme: string;
  visualTheme: string;
  fromLevel: number;
  toLevel: number;
};

export const masterRanks: MasterRank[] = [
  {
    chapter: 1,
    kanji: "初心",
    name: "Shoshin",
    meaning: "The Beginner's Mind",
    theme: "Humility · Learning · Curiosity",
    visualTheme: "Minimal brushwork, simple mountains, open paper",
    fromLevel: 1,
    toLevel: 10,
  },
  {
    chapter: 2,
    kanji: "弟子",
    name: "Deshi",
    meaning: "The Disciple",
    theme: "Practice · Consistency · Patience",
    visualTheme: "Bamboo, temple paper, bronze seal",
    fromLevel: 11,
    toLevel: 20,
  },
  {
    chapter: 3,
    kanji: "修行",
    name: "Shugyō",
    meaning: "The Path of Discipline",
    theme: "Deliberate practice · Routine · Persistence",
    visualTheme: "Ink rivers, wood texture, training motifs",
    fromLevel: 21,
    toLevel: 30,
  },
  {
    chapter: 4,
    kanji: "剣士",
    name: "Kenshi",
    meaning: "The Swordsman",
    theme: "Precision · Skill · Execution",
    visualTheme: "Steel grey, mountain mist, refined brushwork",
    fromLevel: 31,
    toLevel: 40,
  },
  {
    chapter: 5,
    kanji: "武士",
    name: "Bushi",
    meaning: "The Warrior",
    theme: "Responsibility · Honor · Reliability",
    visualTheme: "Deep charcoal, gold accents, ancient pine",
    fromLevel: 41,
    toLevel: 50,
  },
  {
    chapter: 6,
    kanji: "達人",
    name: "Tatsujin",
    meaning: "The Master",
    theme: "Craftsmanship · Refinement · Control",
    visualTheme: "Temple architecture, layered landscapes, rich paper",
    fromLevel: 51,
    toLevel: 60,
  },
  {
    chapter: 7,
    kanji: "名人",
    name: "Meijin",
    meaning: "The Great Master",
    theme: "Mastery through repetition",
    visualTheme: "Detailed mountains, expanded Hall, silver seals",
    fromLevel: 61,
    toLevel: 70,
  },
  {
    chapter: 8,
    kanji: "宗師",
    name: "Sōshi",
    meaning: "The Grand Teacher",
    theme: "Wisdom · Transmission · Guidance",
    visualTheme: "Ancient scrolls, library atmosphere",
    fromLevel: 71,
    toLevel: 80,
  },
  {
    chapter: 9,
    kanji: "無双",
    name: "Musō",
    meaning: "Without Equal",
    theme: "Inner excellence",
    visualTheme: "Golden moon, snow mountains, highest craftsmanship",
    fromLevel: 81,
    toLevel: 90,
  },
  {
    /**
     * Deliberately not a rank. Shu-Ha-Ri is the philosophy that concludes a
     * Journey — the final ten levels are transcendence, not promotion.
     */
    chapter: 10,
    kanji: "守破離",
    name: "Shu-Ha-Ri",
    meaning: "Obey. Break. Transcend.",
    theme: "There is no higher title. Only deeper practice.",
    visualTheme: "The closing of the circle",
    fromLevel: 91,
    toLevel: 100,
  },
];

export function rankForLevel(levelWithinJourney: number): MasterRank {
  const level = Math.min(Math.max(1, levelWithinJourney), JOURNEY_LEVELS);
  return masterRanks.find((r) => level >= r.fromLevel && level <= r.toLevel) ?? masterRanks[0]!;
}

export function nextRankAfter(levelWithinJourney: number): MasterRank | null {
  const current = rankForLevel(levelWithinJourney);
  return masterRanks.find((r) => r.chapter === current.chapter + 1) ?? null;
}

/** The levels at which a promotion fires — the start of each new chapter. */
export const PROMOTION_LEVELS = masterRanks.filter((r) => r.fromLevel > 1).map((r) => r.fromLevel);

/* ------------------------------------------------------------------ *
 * Journeys
 * ------------------------------------------------------------------ */

export type ProgressionState = {
  lifetimeXP: number;

  /** Level within the current Journey, 1–100. */
  currentLevel: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;

  /** 1-based. Journey 1 is the first. */
  currentJourney: number;
  levelWithinJourney: number;
  /** 0–100, how far through this Journey. */
  journeyProgress: number;
  journeyXP: number;
  completedJourneys: number;

  masterRank: MasterRank;
  chapter: number;
  nextRank: MasterRank | null;
  levelsToNextRank: number;
};

/**
 * The single derivation: lifetime XP in, complete progression state out.
 *
 * A Journey completes when level 100 is reached, which costs exactly
 * JOURNEY_XP. So completed Journeys are simply how many whole Journeys the
 * lifetime total contains — no stored state, no event needed.
 */
export function progressionFor(lifetimeXP: number): ProgressionState {
  const total = Math.max(0, Math.floor(lifetimeXP));

  const completedJourneys = Math.floor(total / JOURNEY_XP);
  const journeyXP = total % JOURNEY_XP;

  // Walk the cumulative table to find the level this Journey XP has reached.
  let level = 1;
  while (level < JOURNEY_LEVELS && journeyXP >= CUMULATIVE[level + 1]!) {
    level += 1;
  }

  const xpIntoLevel = journeyXP - CUMULATIVE[level]!;
  const xpForNextLevel = level >= JOURNEY_LEVELS ? 0 : xpToNextLevel(level);
  const rank = rankForLevel(level);
  const next = nextRankAfter(level);

  return {
    lifetimeXP: total,
    currentLevel: level,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent: xpForNextLevel === 0 ? 100 : Math.round((xpIntoLevel / xpForNextLevel) * 100),
    currentJourney: completedJourneys + 1,
    levelWithinJourney: level,
    journeyProgress: Math.round((journeyXP / JOURNEY_XP) * 100),
    journeyXP,
    completedJourneys,
    masterRank: rank,
    chapter: rank.chapter,
    nextRank: next,
    levelsToNextRank: next ? next.fromLevel - level : 0,
  };
}

/** Total lifetime XP at which a given Journey and level is reached. */
export function xpAtJourneyLevel(journey: number, level: number): number {
  return (journey - 1) * JOURNEY_XP + CUMULATIVE[Math.min(level, JOURNEY_LEVELS)]!;
}

/**
 * Promotions crossed between two lifetime XP values, as stable ids.
 * Used to fire a ceremony exactly once — the caller persists the last
 * acknowledged id, never the progression itself.
 */
export function promotionsBetween(previousXP: number, currentXP: number): string[] {
  if (currentXP <= previousXP) return [];

  const before = progressionFor(previousXP);
  const after = progressionFor(currentXP);
  const ids: string[] = [];

  let journey = before.currentJourney;
  let level = before.currentLevel;

  while (
    journey < after.currentJourney ||
    (journey === after.currentJourney && level < after.currentLevel)
  ) {
    level += 1;
    if (level > JOURNEY_LEVELS) {
      journey += 1;
      level = 1;
    }
    if (PROMOTION_LEVELS.includes(level)) {
      ids.push(promotionId(journey, level));
    }
  }

  return ids;
}

export function promotionId(journey: number, level: number): string {
  return `promotion:j${journey}:l${level}`;
}

/** Journey completions crossed, as stable ids — one Chronicle each. */
export function journeyCompletionsBetween(previousXP: number, currentXP: number): number[] {
  const before = progressionFor(previousXP).completedJourneys;
  const after = progressionFor(currentXP).completedJourneys;
  const out: number[] = [];
  for (let j = before + 1; j <= after; j += 1) out.push(j);
  return out;
}
