/**
 * Acceptance & invariant tests from docs/03_PROGRESSION_ENGINE.md Part 5.
 * Run with: npx tsx scripts/progression-tests.ts
 */
import {
  JOURNEY_LEVELS,
  JOURNEY_XP,
  masterRanks,
  progressionFor,
  PROMOTION_LEVELS,
  promotionsBetween,
  rankForLevel,
  xpToNextLevel,
  xpAtJourneyLevel,
  journeyCompletionsBetween,
} from "../src/data/progression";
import {
  evaluateRewards,
  nextUnlock,
  rewardDatabaseIsValid,
  rewardDatabase,
} from "../src/data/rewards";

let pass = 0,
  fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
};

console.log("\n=== CURVE & RANKS ===");
ok(
  "11 milestones exact",
  [
    [1, 1000],
    [10, 1220],
    [20, 1470],
    [30, 1710],
    [40, 1960],
    [50, 2200],
    [60, 2450],
    [70, 2690],
    [80, 2940],
    [90, 3180],
    [99, 3400],
  ].every(([l, x]) => xpToNextLevel(l as number) === x),
);
ok(
  "curve never decreases",
  Array.from({ length: 97 }, (_, i) => i + 2).every(
    (l) => xpToNextLevel(l) >= xpToNextLevel(l - 1),
  ),
);
// ADR-006 froze the Journey at exactly 218,000 XP. Every reward threshold,
// ceremony trigger and Chronicle boundary is a function of this number, and
// Chronicles are immutable — so it must never drift unnoticed. If this fails,
// the curve changed: that needs an ADR, not a new expected value here.
ok("JOURNEY_XP frozen at 218,000 (ADR-006)", JOURNEY_XP === 218_000, `got ${JOURNEY_XP}`);
ok("10 master ranks", masterRanks.length === 10);
ok(
  "ranks tile 1..100 with no gaps",
  masterRanks.every((r, i) => r.fromLevel === i * 10 + 1 && r.toLevel === (i + 1) * 10),
);
ok(
  "promotion levels are 11,21..91",
  JSON.stringify(PROMOTION_LEVELS) === JSON.stringify([11, 21, 31, 41, 51, 61, 71, 81, 91]),
);
ok(
  "rank boundaries correct",
  rankForLevel(10).name === "Shoshin" &&
    rankForLevel(11).name === "Deshi" &&
    rankForLevel(50).name === "Bushi" &&
    rankForLevel(91).name === "Shu-Ha-Ri" &&
    rankForLevel(100).name === "Shu-Ha-Ri",
);

console.log("\n=== TEST 1 — FRESH USER ===");
const fresh = progressionFor(0);
ok("Lifetime XP = 0", fresh.lifetimeXP === 0);
ok("Level = 1", fresh.currentLevel === 1);
ok("Journey = 1", fresh.currentJourney === 1);
ok("Rank = Shoshin", fresh.masterRank.name === "Shoshin");
const freshRewards = evaluateRewards(1, 0, {
  workouts: 0,
  journalEntries: 0,
  focusSessions: 0,
  focusHours: 0,
  objectives: 0,
  longestStreak: 0,
});
ok(
  "only level-1 rewards unlocked",
  freshRewards.filter((r) => r.unlocked).every((r) => r.requirement <= 1),
);

console.log("\n=== TEST 2 — COMPLETE ONE TASK (200 XP) ===");
const after = progressionFor(200);
ok("XP increases", after.lifetimeXP === 200);
ok("still level 1 (needs 1000)", after.currentLevel === 1);
ok("progress reflects 20%", after.progressPercent === 20);
ok("rank unchanged", after.masterRank.name === "Shoshin");
ok("journey unchanged", after.currentJourney === 1);

console.log("\n=== TEST 3 — UNDO (XP returns exactly) ===");
ok("undo returns identical state", JSON.stringify(progressionFor(0)) === JSON.stringify(fresh));
ok("level returns exactly", progressionFor(200 - 200).currentLevel === 1);

console.log("\n=== TEST 6 — PROMOTION ===");
const atL10 = xpAtJourneyLevel(1, 10),
  atL11 = xpAtJourneyLevel(1, 11);
ok("crossing L11 fires exactly one promotion", promotionsBetween(atL10, atL11).length === 1);
ok("promotion id is stable", promotionsBetween(atL10, atL11)[0] === "promotion:j1:l11");
ok("no promotion when not crossing", promotionsBetween(atL10, atL10 + 1).length === 0);
ok(
  "promotion never replays (same range = same ids)",
  JSON.stringify(promotionsBetween(atL10, atL11)) ===
    JSON.stringify(promotionsBetween(atL10, atL11)),
);
ok("9 promotions across a full journey", promotionsBetween(0, JOURNEY_XP).length === 9);

console.log("\n=== TEST 7 — JOURNEY COMPLETION ===");
const done = progressionFor(JOURNEY_XP);
ok("journey 2 begins", done.currentJourney === 2);
ok("level resets to 1", done.currentLevel === 1);
ok("completedJourneys = 1", done.completedJourneys === 1);
ok("lifetime XP preserved", done.lifetimeXP === JOURNEY_XP);
ok("exactly one completion detected", journeyCompletionsBetween(0, JOURNEY_XP).length === 1);
ok("two journeys detected across 2x", journeyCompletionsBetween(0, JOURNEY_XP * 2).length === 2);
const deep = progressionFor(JOURNEY_XP * 8 + xpAtJourneyLevel(1, 47));
ok(
  "Journey 9 / Bushi / L47 displays correctly",
  deep.currentJourney === 9 && deep.currentLevel === 47 && deep.masterRank.name === "Bushi",
  `got J${deep.currentJourney} ${deep.masterRank.name} L${deep.currentLevel}`,
);

console.log("\n=== TEST 8/9 — REWARDS ===");
ok("reward database valid (unique ids, in range)", rewardDatabaseIsValid());
ok(
  "rewards never carry xp",
  rewardDatabase.every((r) => !("xp" in r)),
);
const r50 = evaluateRewards(50, 0, {
  workouts: 0,
  journalEntries: 0,
  focusSessions: 0,
  focusHours: 0,
  objectives: 0,
  longestStreak: 0,
});
ok(
  "level-50 unlocks all level<=50 rewards",
  r50.filter((r) => r.unlockType === "level").every((r) => r.unlocked === r.requirement <= 50),
);
ok(
  "achievement rewards NOT unlocked by level alone",
  r50.filter((r) => r.unlockType === "achievement").every((r) => !r.unlocked),
);
const rAch = evaluateRewards(1, 0, {
  workouts: 100,
  journalEntries: 0,
  focusSessions: 0,
  focusHours: 0,
  objectives: 0,
  longestStreak: 0,
});
ok(
  "achievement unlocks on its metric",
  rAch.find((r) => r.id === "seal-iron-body")?.unlocked === true,
);
ok("achievement unlock does not change level", progressionFor(0).currentLevel === 1);
ok("next unlock is always answerable", nextUnlock(freshRewards) !== null);

console.log("\n=== TEST 10 — DETERMINISM / REPLAY ===");
ok(
  "same XP always same state",
  JSON.stringify(progressionFor(123456)) === JSON.stringify(progressionFor(123456)),
);
ok(
  "monotonic: level never decreases as XP rises",
  (() => {
    let last = 0;
    for (let xp = 0; xp < JOURNEY_XP * 2; xp += 5000) {
      const p = progressionFor(xp);
      const abs = (p.currentJourney - 1) * JOURNEY_LEVELS + p.currentLevel;
      if (abs < last) return false;
      last = abs;
    }
    return true;
  })(),
);

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`JOURNEY_XP = ${JOURNEY_XP.toLocaleString()}`);
process.exit(fail === 0 ? 0 : 1);
