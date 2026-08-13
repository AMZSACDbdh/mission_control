# Mission Control — Progression Engine Specification

**Author:** OpenAI + Mission Control Design
**Status:** DRAFT
**Version:** 1.0

---

## Contents

- [Part 1 — Foundations](#part-1--foundations)
- [Part 2 — Levels, Master Ranks & Journey System](#part-2--levels-master-ranks--journey-system)
- [Part 3 — Reward Engine, Collection System & Promotion Ceremonies](#part-3--reward-engine-collection-system--promotion-ceremonies)
- [Part 4 — Engine Architecture, Algorithms & Data Models](#part-4--engine-architecture-algorithms--data-models)
- [Part 5 — Validation, Regression Tests & Implementation Checklist](#part-5--validation-regression-tests--implementation-checklist)

---

# Part 1 — Foundations

## Purpose

This document defines the complete progression system of Mission Control.

It is the single source of truth for every system related to:

- XP
- Levels
- Master Ranks
- Journeys
- Collections
- Unlocks
- Promotion Ceremonies
- Hall of Mastery integration

Every implementation MUST follow this document.

If the implementation differs from this specification, **the specification is considered correct.**

---

## Philosophy

Mission Control is NOT an RPG.
It is NOT a habit tracker.
It is NOT a productivity app with gamification.

**Mission Control is a Personal Operating System.**

Progression exists to celebrate disciplined living — not to manipulate behavior.

Everything shown inside the application must represent something that genuinely happened.

- Nothing may be fabricated.
- Nothing may be duplicated.
- Nothing may be stored twice.

Progression is earned. Never simulated.

---

## Core Design Principles

The following principles are non-negotiable. Changing any of them fundamentally
changes Mission Control.

### Principle 1 — Reality over Motivation

The application rewards completed work.

- Planning never earns XP.
- Opening pages never earns XP.
- Editing tasks never earns XP.
- Rearranging tasks never earns XP.

Only real completed work creates progression.

### Principle 2 — The Activity Ledger is the only source of truth

Every progression value is derived.

- Nothing is manually synchronized.
- Nothing is cached permanently.
- Nothing is editable.

Every statistic shown in Mission Control must be reproducible by replaying the ledger.

### Principle 3 — History is immutable

Once XP has been written into an ActivityEvent it never changes.

Future balancing changes future events only. Past effort is never re-priced.

### Principle 4 — Progression celebrates effort

XP does NOT measure intelligence, talent, success, income, grades, or luck.

XP represents disciplined effort invested into meaningful personal growth.

### Principle 5 — Collections celebrate progress

XP measures effort. Collections celebrate milestones. These systems MUST remain
independent.

- A cosmetic reward must never increase XP.
- XP must never unlock gameplay advantages.

---

## Progression Architecture

Mission Control contains TWO completely independent progression systems.
System A measures progression. System B celebrates progression.
**They never influence each other.**

**System A — Measurement**

```
Activity → Ledger → XP → Level → Master Rank → Journey → Hall of Mastery
```

**System B — Celebration**

```
Achievements → Collections → Cosmetic Unlocks → Themes → Ceremonies → Hall of Mastery
```

These systems may reference each other visually. They must never affect each
other's calculations.

---

## The Progression Pyramid

Every action ultimately contributes to a single hierarchy.

```
Activity → XP → Level → Master Rank → Journey → Legacy
```

- Nothing skips a layer.
- Nothing bypasses XP.
- Nothing directly increases Master Rank.

---

## The Four Progression Loops

Mission Control intentionally contains four overlapping progression loops.
Each solves a different psychological need.

| Loop | Duration | Reward | Purpose — the feeling created |
| --- | --- | --- | --- |
| **One — Daily** | One day | XP, Form, Streak, completed work | "I made progress today." |
| **Two — Weekly** | Seven days | Weekly Chronicle, Weekly Reflection, Weekly Statistics | "This week mattered." |
| **Three — Journey** | ~one year | Levels, Master Rank Promotions, Collections, Ceremonies, Journey Completion | "I have become someone different." |
| **Four — Lifetime** | Forever | Hall of Mastery, Personal Records, Lifetime XP, Completed Journeys, Historical Legacy | "My discipline has left a permanent record." |

---

## XP Engine

XP is the fundamental progression currency.

- XP is lifetime.
- XP never decreases.
- XP is awarded only by immutable ActivityEvents.
- XP can never be edited manually.
- XP can never be recalculated after being awarded.
- XP can never be duplicated.
- XP can never exist without an ActivityEvent.

### XP Rules

XP rewards actions. Never intentions, plans, estimates, preparation, or
interface interaction.

The application must **never** award XP for:

- Opening pages
- Planning tomorrow
- Editing tasks
- Moving missions
- Reading statistics
- Changing settings
- Reordering lists
- Customizing themes
- Writing titles
- Deleting data

Only completed work produces XP.

### Lifetime XP

```
Lifetime XP = SUM(all ActivityEvent.xp)
```

No exceptions. No modifiers. No bonuses. No multipliers beyond those already
written into the ledger.

Lifetime XP is monotonic. It only increases.

### XP Categories

Every XP event belongs to exactly one activity category:

Task · Objective · Focus · Workout · Study · Discipline · Journal · Series

Future categories must continue following this rule.

---

## Level Engine

Levels are not the goal. Levels exist to create regular moments of progression.

Users should level frequently enough to remain motivated, and never so often
that levels become meaningless.

| Stage | Target progression |
| --- | --- |
| Early Journey | 1 level every 2–4 productive days |
| Middle Journey | 1 level every 5–7 productive days |
| Late Journey | 1 level every 8–12 productive days |

This pacing is intentional.

---

## Journey Structure

One Journey contains:

- 100 Levels
- 10 Master Ranks
- 10 Levels per Master Rank

Completion of Level 100 awards one Menkyo Scroll.

Lifetime XP continues. Journey Two begins immediately. Nothing resets. Nothing
is lost. Only the Journey number increases.

---

# Part 2 — Levels, Master Ranks & Journey System

## Design Objective

The progression system must satisfy five goals simultaneously.

1. Every productive week should feel rewarding.
2. Every month should feel like meaningful advancement.
3. Every Master Rank should feel like a promotion rather than a level.
4. Completing one Journey should feel like finishing an important chapter of life.
5. Lifetime progression should remain meaningful after decades of use.

This progression system is intentionally inspired by Japanese craftsmanship and
lifelong mastery rather than RPG power scaling.

---

## Journey

A Journey represents approximately one year of disciplined living.

A Journey is NOT tied to a calendar year. A Journey begins the day the user
starts Journey 1. Journey progression is personal — two users beginning on
different dates should complete Journeys on different dates.

Journeys are permanent. Completed Journeys are archived forever. They never
disappear.

### Structure

```
Journey → 100 Levels → 10 Master Ranks → Journey Completion
        → Menkyo Scroll Awarded → Journey +1 begins
```

**Nothing resets except:**

- Current Level
- Current Journey Progress
- Current cosmetic unlock progression

**Everything else remains:** Lifetime XP, Personal Records, Hall of Mastery,
Collections, Achievements.

---

## Levels

Levels are the smallest visible progression unit.

**Purpose:** create frequent positive reinforcement. A level should never feel
impossible, and never feel trivial.

Levels exist primarily to communicate forward movement. They are NOT intended to
represent mastery. **Mastery is represented by Master Rank.**

### Target Level Frequency

| User stage | Frequency |
| --- | --- |
| New User | Every 2–3 productive days |
| Regular User | Every 4–6 productive days |
| Late Journey | Every 7–10 productive days |
| Journey Completion | Approximately 9–16 months, centring near one year |

The exact duration depends on real usage. These figures are measured against the
frozen economy, not estimated: ~450 XP on a realistic day and ~800 on a strong
one. The slower end of each band is the ~350 XP/day pace, the faster end ~800.

> **Revised by ADR-006 (7 August 2026).** The late-journey band previously read
> 8–12 days and Journey completion 10–14 months. Those two figures were
> arithmetically incompatible — 34 late levels at 8–12 days each consume
> 272–408 days by themselves, before the other 65 levels. The bands above are
> what the frozen curve actually produces.

---

## XP Curve Philosophy

The XP curve must satisfy four conditions.

1. **Early levels arrive quickly.** Users should understand the progression system within the first week.
2. **Mid-game slows naturally.** The user begins earning promotions rather than merely levels.
3. **Late-game feels earned.** Final promotions should require sustained discipline. They should never become impossible.
4. **No level should ever require grinding.** Mission Control is not designed around farming XP. The user should advance by living normally, never by optimizing for XP.

### XP Curve

The progression curve grows gently. It is NOT exponential. The cost of a level
rises **linearly** — 1,000 XP at level 1 to 3,400 at level 99 — which is what
makes the endpoints and the Journey total mutually consistent. The purpose is
psychological pacing; linearity is the shape that delivers it here, not an
aesthetic preference.

| Level | XP To Next |
| --- | --- |
| 1 | 1,000 |
| 10 | 1,220 |
| 20 | 1,470 |
| 30 | 1,710 |
| 40 | 1,960 |
| 50 | 2,200 |
| 60 | 2,450 |
| 70 | 2,690 |
| 80 | 2,940 |
| 90 | 3,180 |
| 99 | 3,400 |

Between milestones the curve interpolates smoothly. No sudden jumps. No cliffs.

Levels still decelerate as you climb — the last costs 3.4× the first — but never
enough to become a wall, satisfying condition 3 above without violating
condition 4.

### Journey Total — FROZEN

One Journey is **exactly 218,000 XP** (levels 1 → 100). This number is asserted
in `scripts/progression-tests.ts` so it can never drift silently.

### Estimated Lifetime XP

An average disciplined year ≈ **164,000–290,000 XP** (measured: ~450 XP on a
realistic day, ~800 on a strong one). 218,000 sits at the centre of that band,
so an ordinary disciplined year naturally completes one Journey.

Future balancing should adjust the curve if required. **Never rebalance
historical XP.**

> **Revised by ADR-006 (7 August 2026).** The table above previously ran 1,000 →
> 18,000, producing a Journey of 772,300 XP — 2.6–4.7 years against the measured
> economy, not the one year this document promises. The milestone table was the
> single component that could not coexist with the specification's own stated
> duration and pacing, so it was the component replaced. The economy in Part 1
> and the ranks in Part 2 were deliberately left untouched. See
> `docs/decisions/ADR-006-journey-xp-curve.md`.

---

## Master Ranks

Levels communicate progress. **Master Ranks communicate identity.**

When someone reaches Bushi, they should remember *becoming Bushi*. They should
not merely remember reaching Level 43.

**Promotion frequency:** approximately one promotion every month. Promotions are
intentionally rare. They are major events.

### Rank Structure

| Levels | Kanji | Name | Meaning | Theme | Visual Theme |
| --- | --- | --- | --- | --- | --- |
| 1–10 | 初心 | **Shoshin** | The Beginner's Mind | Humility, learning, curiosity | Minimal brushwork, simple mountains, open paper |
| 11–20 | 弟子 | **Deshi** | The Disciple | Practice, consistency, patience | Bamboo, temple paper, bronze seal |
| 21–30 | 修行 | **Shugyō** | The Path of Discipline | Deliberate practice, routine, persistence | Ink rivers, wood texture, training motifs |
| 31–40 | 剣士 | **Kenshi** | The Swordsman | Precision, skill, execution | Steel grey, mountain mist, refined brushwork |
| 41–50 | 武士 | **Bushi** | The Warrior | Responsibility, honor, reliability | Deep charcoal, gold accents, ancient pine |
| 51–60 | 達人 | **Tatsujin** | The Master | Craftsmanship, refinement, control | Temple architecture, layered landscapes, rich paper |
| 61–70 | 名人 | **Meijin** | The Great Master | Mastery through repetition | Detailed mountains, expanded Hall, silver seals |
| 71–80 | 宗師 | **Sōshi** | The Grand Teacher | Wisdom, transmission, guidance | Ancient scrolls, library atmosphere |
| 81–90 | 無双 | **Musō** | Without Equal | Inner excellence | Golden moon, snow mountains, highest craftsmanship |
| 91–100 | 守破離 | **Shu-Ha-Ri** | Obey. Break. Transcend. | — | — |

**Shu-Ha-Ri is intentionally not a rank.** It is the philosophy that concludes
Journey One. The final ten levels represent transcendence rather than promotion.
There is no higher title. Only deeper practice.

---

## Journey Completion

Completing Level 100 triggers Journey Completion. The application performs the
following sequence:

1. Freeze progression.
2. Generate Journey Chronicle.
3. Award Menkyo Scroll.
4. Archive Journey.
5. Begin Journey +1.

Lifetime XP remains unchanged. Collections remain. Hall remains. Records remain.
Only the Journey changes.

---

## Menkyo Scroll

Every completed Journey awards exactly one Menkyo Scroll. The scroll becomes a
permanent artifact inside the Hall of Mastery. It cannot be deleted. It cannot be
edited. It represents historical truth.

Every Menkyo Scroll records:

- Journey Number
- Start Date
- Completion Date
- Lifetime XP at Completion
- Total Journey XP
- Total Focus Hours
- Longest Streak
- Best XP Day
- Best Focus Day
- Most Improved Area
- Most Earned Area
- Favorite Philosophy Quote
- Promotion Timeline
- Journey Duration

The scroll functions as a historical certificate. Not as a collectible.

---

## Journey Philosophy

The purpose of Journeys is not endless leveling. The purpose is to divide a
lifelong practice into meaningful chapters.

Mission Control should never display:

> Level 948

Instead it should display:

> Journey 9 · Bushi · Level 47

This maintains meaningful progression forever.

---

# Part 3 — Reward Engine, Collection System & Promotion Ceremonies

## Purpose

Mission Control does not reward users with power. It rewards users with history,
identity, beauty and personalization.

Rewards exist to celebrate progress, never to accelerate it.

A reward must never:

- Increase XP
- Increase Form
- Increase Streak
- Modify calculations
- Unlock gameplay advantages
- Change the progression speed

Rewards are cosmetic or commemorative only.

---

## Reward Architecture

**Progression System**

```
XP → Levels → Master Ranks → Journey
```

**Celebration System**

```
Achievements → Collections → Unlocks → Ceremonies → Hall of Mastery
```

These systems are completely independent.

---

## Reward Categories

### A. Progression Rewards

Predictable. Unlocked by Levels.

Examples: New Enso · New Paper · New Mountain · New Hanko · New Quote Frame ·
New Ambient Theme

The user always knows the next unlock.

### B. Mastery Rewards

Earned. Unlocked by accomplishments.

Examples: 100 Workouts · 365 Journal Entries · 500 Focus Sessions · 1000 Focus
Hours · 100 Objectives Completed · 365-Day Streak

These cannot be earned simply by leveling.

---

## Collection Philosophy

- Collections are permanent.
- Collections never expire.
- Collections are account history.
- Collections are never consumed.
- Collections are never traded.
- Collections are never randomized.

**No loot boxes. No probability. No paid unlocks.**

Every unlock has one deterministic requirement.

---

## Collections

| # | Collection | Purpose | Examples |
| --- | --- | --- | --- |
| 1 | **Enso** | Personal identity — used in Sidebar, Hall, Profile, Promotion Screen | Apprentice Brush, Temple Circle, Broken Circle, Weathered Circle, Master Stroke, Golden Enso |
| 2 | **Washi** | Journal customization — only affects reflective pages | Rice Paper, Temple Washi, Handmade Washi, Snow Washi, Ancient Scroll, Imperial Paper |
| 3 | **Mountain** | Background artwork, unlocked gradually | Morning Valley, Bamboo Ridge, Mist Mountain, Fuji Dawn, Winter Summit, Endless Peaks |
| 4 | **Moon** | Night atmosphere | Crescent, Half Moon, Harvest Moon, Winter Moon, Golden Moon |
| 5 | **Hanko** | Personal seal, used throughout Hall and ceremonies | Bronze, Iron, Gold, Jade, Cinnabar, Master's Seal |
| 6 | **Philosophy Frames** | Decorative quote borders | Bamboo, Waves, Pine, Temple, Crane, Dragon |
| 7 | **Ambient Themes** | Optional sounds — disabled by default | Temple Bell, Rain, Wind, River, Night Forest, Bamboo Grove |
| 8 | **Hall Decorations** | Permanent visual artifacts — Hall becomes richer over time | Scroll Shelf, Training Sword, Lantern, Bonsai, Calligraphy Table, Shrine Display |
| 9 | **Journey Scrolls** | One per completed Journey | Cannot be edited. Cannot be removed. |
| 10 | **Ceremonial Seals** | Very rare | Awarded only for mastery achievements. Never by XP alone. |

---

## Unlock Rhythm

| Milestone | Reward |
| --- | --- |
| Every Level | XP animation, progress update |
| Every 5 Levels | Cosmetic unlock |
| Every 10 Levels | Promotion Ceremony, new Master Rank, major Collection unlock |
| Every 25 Levels | Legendary Collection item |
| Level 100 | Menkyo Scroll, Journey Completion, Journey Chronicle, Journey Ceremony |

This rhythm should remain consistent across all Journeys.

---

## Ceremonies

### Promotion Ceremony

Promotion ceremonies are mandatory. Users may skip them; they cannot be disabled
globally.

**Purpose:** create memorable milestones.

1. Fade current interface.
2. Pause background animation.
3. Slow ambient sound.
4. Draw Enso using brush animation.
5. Reveal Kanji.
6. Reveal English title.
7. Show philosophy quote.
8. Apply Hanko seal.
9. Unlock rewards.
10. Continue.

**Target duration:** 6–10 seconds.

Never flashy. Never loud. Never arcade-like. The feeling should resemble
receiving a martial arts certificate.

### Level-Up Ceremony

Standard level-ups are intentionally subtle.

```
XP Bar fills → Soft sound → Small ink splash → Level increments → Progress saved
```

**Target duration:** 1–2 seconds.

### Journey Completion Ceremony

The longest ceremony in Mission Control.

```
Freeze interface → Fade music → Complete final Enso → Reveal Journey Complete
→ Generate Journey Chronicle → Award Menkyo Scroll → Archive Journey
→ Display Hall update → Begin Journey +1 → Return Home
```

**Target duration:** 20–30 seconds. May be skipped. Never repeats.

---

## Journey Chronicle

Automatically generated. **No AI. No editing.**

Contains: Journey Number · Started · Completed · Duration · Lifetime XP ·
Journey XP · Levels Earned · Master Ranks Earned · Focus Hours · Study Hours ·
Workouts · Journal Entries · Objectives Completed · Tasks Completed · Best
Streak · Longest Focus Session · Best XP Day · Favorite Quote · Most Active Area
· Strongest Form · Journey Seal

Chronicles are archived permanently.

---

## Reward Visibility

Every reward must answer one question: **"What can I earn next?"**

Every progression screen must display:

```
Current Level → Next Unlock → Levels Remaining → Master Rank Progress → Journey Progress
```

Users should never wonder what comes next.

---

## Equippable vs Historical

| Equippable | Historical |
| --- | --- |
| Enso | Menkyo Scrolls |
| Mountains | Journey Chronicles |
| Washi | Promotion Dates |
| Ambient Theme | Hall Records |
| Quote Frame | Achievement Dates |
| Hanko | |

Historical items cannot be modified. They represent truth.

---

## Future-Proofing

New collections may be added. Existing collections must never change unlock
requirements after release. Previously earned rewards remain permanently
unlocked.

Future Journeys may introduce new cosmetic collections without changing previous
Journey rewards.

The progression engine must support unlimited Journeys while maintaining
backward compatibility.

---

# Part 4 — Engine Architecture, Algorithms & Data Models

## Architecture

The Progression Engine is a pure derived system. It never owns state. It never
stores calculated values. It consumes immutable ActivityEvents and produces
derived progression data.

```
Activity Ledger → XP Engine → Level Engine → Master Rank Engine
                → Journey Engine → Reward Engine → Hall of Mastery
```

No engine may bypass another engine. Every engine must be deterministic — given
the same ledger, every engine must always return identical results.

---

## Engine Responsibilities

### XP Engine

**Input:** Activity Ledger
**Output:** Lifetime XP, Today's XP, Weekly XP, Monthly XP, Yearly XP, Journey XP
**Responsibilities:** Sum immutable XP · Never modify XP · Never rebalance XP ·
Never infer missing XP

### Level Engine

**Input:** Lifetime XP
**Output:** Current Level, XP Into Current Level, XP Remaining, Progress %, Next Level XP
**Responsibilities:** Convert XP into Level · Never store Level · Never mutate XP

### Master Rank Engine

**Input:** Current Level
**Output:** Current Master Rank, Current Chapter, Levels Remaining, Promotion Progress
**Responsibilities:** Determine rank · Determine promotion state · Determine current philosophy

### Journey Engine

**Input:** Lifetime XP, Current Level
**Output:** Current Journey, Journey Progress, Journey XP, Completed Journeys
**Responsibilities:** Detect Journey completion · Generate Journey Chronicle · Archive completed Journey

### Reward Engine

**Input:** Level, Master Rank, Journey, Achievements
**Output:** Unlocked Cosmetics, Locked Cosmetics, Next Unlock
**Responsibilities:** Never modify progression · Never award XP · Never affect calculations

---

## Data Models

```ts
type ProgressionState = {
  lifetimeXP: number
  currentLevel: number
  xpIntoLevel: number
  xpForNextLevel: number
  progressPercent: number

  currentJourney: number
  levelWithinJourney: number
  journeyProgress: number

  masterRank: MasterRank
  chapter: number

  nextUnlock?: Unlock
}
```

```ts
type JourneyRecord = {
  id: string
  journey: number
  startedAt: string
  completedAt: string
  durationDays: number
  journeyXP: number
  lifetimeXP: number
  focusHours: number
  studyHours: number
  workouts: number
  objectivesCompleted: number
  tasksCompleted: number
  bestXPDay: number
  longestStreak: number
  favouriteQuote?: string
  strongestArea: Area
}
```

```ts
type CosmeticUnlock = {
  id: string
  category: CosmeticCategory
  name: string
  description: string
  unlockType: "level" | "achievement" | "journey"
  requirement: number
  unlockedAt?: string
}
```

---

## Algorithms

### Level Calculation

The Level Engine must never iterate through stored level objects. Levels are
derived mathematically. The implementation may cache the XP table but must never
persist calculated levels.

1. Read Lifetime XP.
2. Determine current Journey.
3. Determine XP within Journey.
4. Traverse Journey XP table.
5. Return current Level.

No database writes occur.

### Journey Calculation

Journey size: 100 Levels.

```
Total Lifetime XP → Determine completed Journeys → Subtract Journey XP
→ Calculate current Journey progress → Return Journey State
```

Journey completion is derived. Never stored.

### Promotion Detection

Promotion occurs whenever Current Level crosses: **11, 21, 31, 41, 51, 61, 71, 81, 91**

Promotion fires once. Never repeats. Reloading the page must not replay previous
promotions.

Implementation should persist only the **last acknowledged promotion ID**, not
progression values.

### Unlock Detection

For each reward:

```
IF requirement satisfied AND reward not unlocked
→ Unlock reward → Queue celebration → Persist unlock timestamp
```

Unlock evaluation should occur after every ledger update.

### XP Pipeline

```
Activity Completed → Ledger Event Written → XP Engine Updates
→ Level Engine Recalculates → Rank Engine Recalculates
→ Reward Engine Evaluates → Hall Updates → UI Re-renders
```

Every stage is synchronous and deterministic.

---

## Caching

Only derived values may be cached. Never cache source data.

| Allowed | Forbidden |
| --- | --- |
| Level Table | Current Level |
| XP Curve | Current XP |
| Journey XP Thresholds | Current Rank |
| Reward Indexes | Current Journey |
| | Current Form |

Forbidden values must always be derived.

---

## Performance

The application must comfortably support **100,000+ Activity Events** without
noticeable delay.

Recommended:

- Memoize expensive calculations.
- Cache completed Journey summaries.
- Cache previous month statistics.
- Replay only current partial data.

**Never compromise correctness for speed.**

---

## Persistence

| Persist | Never Persist |
| --- | --- |
| Activity Ledger | Current Level |
| Reward Unlocks | Current Rank |
| Journey Chronicles | Journey Progress |
| Equipped Cosmetics | Progress % |
| Settings | XP Into Level |
| | Promotion % |

Everything in the right column is derived.

---

## Failure Recovery

If a cache becomes invalid:

```
Delete cache → Replay ledger → Recalculate everything
```

The ledger is always authoritative. Users must never lose progression because of
cache corruption.

---

## Determinism

Given an identical ledger, an identical reward database, and an identical XP
curve, the engine must always produce identical progression.

- No randomness is permitted.
- No time-based modifiers are permitted.
- No hidden multipliers are permitted.

---

# Part 5 — Validation, Regression Tests & Implementation Checklist

## Core Invariants

The following rules are absolute. Breaking any of them is considered a bug.

### Activity Ledger

- ✓ Ledger is the only source of truth.
- ✓ Every progression value is derived.
- ✓ No statistic exists outside the ledger.
- ✓ ActivityEvents are immutable.
- ✓ XP written into an ActivityEvent never changes.
- ✓ Undo removes the original event.
- ✓ Undo never creates negative XP events.
- ✓ Duplicate ActivityEvent IDs are impossible.
- ✓ Duplicate refs are impossible.

### XP

- ✓ Lifetime XP never decreases.
- ✓ XP never exists without an ActivityEvent.
- ✓ Every XP value is frozen.
- ✓ XP calculations are deterministic.
- ✓ Planning never awards XP.
- ✓ Editing never awards XP.
- ✓ Rearranging never awards XP.
- ✓ Viewing statistics never awards XP.
- ✓ Settings never award XP.
- ✓ Rewards never award XP.
- ✓ Cosmetics never award XP.

### Levels

- ✓ Level is derived.
- ✓ Level is never stored.
- ✓ Reloading never changes level.
- ✓ Importing never changes level incorrectly.
- ✓ Deleting cache never changes level.
- ✓ Replaying ledger always reproduces identical level.

### Master Rank

- ✓ Rank is derived from Level.
- ✓ Rank is never editable.
- ✓ Rank never decreases.
- ✓ Promotion occurs exactly once.
- ✓ Promotion ceremony never repeats after acknowledgement.

### Journey

- ✓ Journey begins automatically.
- ✓ Journey completion is derived.
- ✓ Journey completion never deletes history.
- ✓ Journey completion never resets Lifetime XP.
- ✓ Journey completion never removes collections.
- ✓ Journey completion archives the previous Journey permanently.
- ✓ Every Journey produces exactly one Chronicle.
- ✓ Every Journey produces exactly one Menkyo Scroll.

### Rewards

- ✓ Every reward has one deterministic requirement.
- ✓ Rewards never expire.
- ✓ Rewards never affect progression.
- ✓ Rewards never increase XP.
- ✓ Rewards never increase Form.
- ✓ Rewards never increase Streak.
- ✓ Historical rewards cannot be deleted.
- ✓ Unlock timestamps are immutable.

### Hall of Mastery

- ✓ Hall derives every statistic.
- ✓ Hall never stores calculated values.
- ✓ Hall always reflects ledger history.
- ✓ Hall records are immutable.

---

## Acceptance Tests

| # | Test | Setup | Expected |
| --- | --- | --- | --- |
| 1 | **Fresh User** | Empty Ledger | Lifetime XP = 0 · Level = 1 · Journey = 1 · Rank = Shoshin · No rewards unlocked |
| 2 | **Complete One Task** | Write one ActivityEvent | XP increases · Level recalculates · Rank unchanged · Journey unchanged · Hall updates |
| 3 | **Undo Task** | Remove ActivityEvent | XP returns exactly · Level returns exactly · No duplicate events · No negative XP |
| 4 | **Import Backup** | Import identical backup twice | Ledger merges by ID · No duplicated XP · No duplicated unlocks · No duplicated Journey records |
| 5 | **Cache Deletion** | Delete every cache, keep ledger, reload | Every statistic identical |
| 6 | **Promotion** | Cross promotion threshold | Promotion ceremony queues · Master Rank updates · Reward unlocks · Promotion cannot replay |
| 7 | **Journey Completion** | Reach Journey completion | Chronicle generated · Menkyo generated · Journey archived · Journey 2 begins · Lifetime XP preserved · Collections preserved |
| 8 | **Reward Unlock** | Reach cosmetic unlock | Reward unlocked once · Timestamp recorded · Never unlocks again |
| 9 | **Achievement Reward** | Complete achievement | Achievement reward unlocks · XP unchanged · Journey unchanged |
| 10 | **Replay Ledger** | Recalculate everything from scratch | Every value identical |

---

## Regression Tests

After every update verify the following are unchanged: XP · Levels · Rank ·
Journey · Unlocks · Chronicles · Hall · Collections · Statistics · Streak · Form.

**Any difference requires investigation.**

---

## Future Compatibility

The engine must support unlimited Journeys, ActivityEvents, cosmetic
collections, achievements, and future Master Ranks.

- New collections must never invalidate previous unlocks.
- XP curve updates must affect only future ActivityEvents.
- Historical progression must remain correct forever.

---

## Things The Engine Must Never Do

- Never duplicate XP.
- Never duplicate rewards.
- Never duplicate Journey records.
- Never fabricate statistics.
- Never estimate XP.
- Never infer missing data.
- Never silently modify history.
- Never reset Lifetime XP.
- Never reset Hall records.
- Never overwrite Journey Chronicles.
- Never overwrite Menkyo Scrolls.
- Never unlock rewards randomly.
- Never base progression on anything except the ledger.

---

## Implementation Checklist

Before marking this feature complete, verify every item below.

**Data Layer**

- ☐ Activity Ledger implemented
- ☐ XP Engine implemented
- ☐ Level Engine implemented
- ☐ Rank Engine implemented
- ☐ Journey Engine implemented
- ☐ Reward Engine implemented
- ☐ Chronicle Generator implemented
- ☐ Menkyo Generator implemented

**Logic**

- ☐ XP deterministic
- ☐ Levels deterministic
- ☐ Promotions deterministic
- ☐ Rewards deterministic
- ☐ Journey deterministic

**Persistence**

- ☐ Unlock persistence
- ☐ Chronicle persistence
- ☐ Cosmetic persistence
- ☐ Settings persistence

**Performance**

- ☐ 100k+ ActivityEvents supported
- ☐ Replay completes without noticeable delay
- ☐ Cached values rebuild correctly

**User Experience**

- ☐ Level ceremony implemented
- ☐ Promotion ceremony implemented
- ☐ Journey completion ceremony implemented
- ☐ Hall updates automatically
- ☐ Next reward visible
- ☐ Next promotion visible
- ☐ Journey progress visible

**Verification**

- ☐ Every statistic derived from ledger
- ☐ Every acceptance test passes
- ☐ Every regression test passes
- ☐ No duplicated state exists
- ☐ No hidden calculations exist
- ☐ No TODOs remain

Only when every checkbox above passes should the Progression Engine be
considered production-ready.

---

# Final Principle

Mission Control does not reward users for interacting with the application.

**It rewards users for living with discipline.**

The Progression Engine exists to record that discipline honestly, celebrate it
respectfully, and preserve it permanently.

If an implementation ever sacrifices truth for motivation, the implementation is
incorrect.
