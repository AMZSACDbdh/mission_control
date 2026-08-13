# ADR-006 — The Journey XP Curve

**Status:** Accepted
**Date:** 7 August 2026
**Decider:** Product owner
**Supersedes:** the milestone table in `PROGRESSION-ENGINE.md` (Part 1, XP Curve)
**Resolves:** BLOCKER-1 in `docs/00_PROJECT_CONTEXT.md`

---

## Context

Three statements in the specification could not all be true at once.

| Constraint | Implied Journey length |
| --- | --- |
| Milestone table as written (1,000 → 18,000), implemented as `JOURNEY_XP = 772,300` | 2.6 – 4.7 years |
| Stated pacing bands: 2–4 / 5–7 / 8–12 days per level × 100 levels | ~1.75 years |
| Stated duration: "≈200,000 XP ≈ one Journey", 10–14 months | ~1 year |

Constraints 2 and 3 contradict each other **independently of any
implementation**: 34 late levels at 8–12 days each consume 272–408 days by
themselves, before accounting for the other 65 levels. So this was never a
question of the code disagreeing with the spec — the spec disagreed with itself,
and the code faithfully implemented the one component that was wrong.

Measured against the frozen economy (§7.2 of the project context): ~800 XP on a
strong day, ~450 on a realistic average, giving **164,000–290,000 XP per year**.

That measurement vindicates the spec's ~200,000 figure and convicts the
milestone table, which was too expensive by roughly 3.5×.

### Why this blocked all progression work

Every reward threshold, promotion trigger, ceremony, collection unlock and Hall
timeline entry is a pure function of the curve. Chronicles and Menkyo Scrolls are
**immutable by design** (§2.3, §7.10) — a Journey completed under the wrong curve
permanently records a boundary that would later move, and by rule it can never be
rewritten.

The storage ceiling (BLOCKER-2) destroys data at ~13 months and announces itself.
The wrong curve corrupts the *meaning* of the record forever, and does so
silently. At the time of this decision the only ledger in existence was test
data, which is the cheapest this decision would ever be.

---

## Decision

**Option A: retarget the Journey to exactly 218,000 XP**, replacing the milestone
table with a linear ramp from 1,000 XP at level 1 to 3,400 at level 99.

| Level | XP To Next | | Level | XP To Next |
| --- | --- | --- | --- | --- |
| 1 | 1,000 | | 60 | 2,450 |
| 10 | 1,220 | | 70 | 2,690 |
| 20 | 1,470 | | 80 | 2,940 |
| 30 | 1,710 | | 90 | 3,180 |
| 40 | 1,960 | | 99 | 3,400 |
| 50 | 2,200 | | | |

Interpolation between milestones is unchanged — linear, smooth, no cliffs.

### Why linear

Linearity was not chosen for elegance; it is the only shape that makes the
recommendation's three numbers mutually consistent. With endpoints 1,000 and
3,400, the mean level cost is (1,000 + 3,400) / 2 = 2,200, and 2,200 × 99 levels
= 217,800 ≈ 218,000. A convex curve between the same endpoints sums to *less*
than the linear chord and undershoots the target; a concave one overshoots badly
(a power-law fit through the same endpoints yields ~266,000).

The milestones above round to values that hit **exactly 218,000** with no
residual drift — verified, not estimated.

Levels still decelerate: the last costs 3.4× the first. The deceleration is
simply gentle enough that late levels never become a wall, which satisfies the
curve philosophy's condition 3 without violating condition 4 ("no level should
ever require grinding").

### Resulting pacing

Verified against the frozen economy:

| Level | XP to next | @800/day | @450/day | @350/day |
| --- | --- | --- | --- | --- |
| 1 | 1,000 | 1.3 d | 2.2 d | 2.9 d |
| 30 | 1,710 | 2.1 d | 3.8 d | 4.9 d |
| 50 | 2,200 | 2.8 d | 4.9 d | 6.3 d |
| 70 | 2,690 | 3.4 d | 6.0 d | 7.7 d |
| 99 | 3,400 | 4.3 d | 7.6 d | 9.7 d |

Journey duration: **0.75 years** at a strong pace, **1.33 years** at a
conservative one — centring near one year, as promised.

Honest note on the bands: at 450 XP/day the late levels take ~7.6 days, which is
*adjacent to* rather than inside the spec's original 8–12 day band; they land
inside it at ~350 XP/day. The pacing table in `PROGRESSION-ENGINE.md` has been
revised to 7–10 days to state what the curve actually produces rather than
preserve a number the curve does not deliver.

---

## Alternatives rejected

**Option B — keep the 772,300 table, reframe Journeys as multi-year eras.**
Rejected. It required deleting the "one year" language the product was designed
around, and a 2.6–4.7 year Journey means the overwhelming majority of users would
never see a Journey completion ceremony, a Menkyo Scroll or a Chronicle — the
three artefacts that carry the product's central promise, *"my discipline has
left a permanent record."* Cheapest in code, most expensive in product.

**Option C — raise the economy ~3.5× to fit the table.**
Rejected. It preserves both the table and the one-year duration, but only by
rewriting the fixed task pot and the focus decay curve — the parts of the system
that had already survived an external design review and were deliberately tuned
so that three Critical tasks (600 XP) beat an eight-hour sit (330 XP). It also
forces `RATE_VERSION` to 3, permanently splitting the ledger into two economies
either side of the change. The largest blast radius of the three, aimed at the
component with the strongest evidence behind it.

**Why A wins:** it replaces exactly one component — the only one that could not
coexist with the specification's own stated duration and pacing — and leaves the
economy, the ranks, the promotion levels and the reward rhythm untouched.

---

## Consequences

- `JOURNEY_XP` moves from **772,300** to **218,000**.
- The Journey completion path becomes reachable in realistic testing, retiring
  known bug 11 ("never runtime-tested — reaching it requires 772,300 XP") as a
  practical matter.
- Reward thresholds, promotion levels (11, 21 … 91) and the ten Master Ranks are
  **unchanged** — they are defined in levels, not XP, and the level count did not
  move.
- No existing event changes. XP is frozen per-event with a `rateVersion` (§2.4);
  the curve governs how XP maps to levels, not what any past action was worth.
  `RATE_VERSION` therefore stays at **2**.
- Any ledger already carrying more than 218,000 XP will now show a higher level
  and Journey than before. This is test data only; no Chronicle had been
  generated under the old curve.

## Verification

```bash
npx tsx scripts/progression-tests.ts   # 40 passed, 0 failed
npx tsx scripts/qa-adversarial.ts      # 52 passed, 0 failed
```

`progression-tests.ts` now asserts `JOURNEY_XP === 218_000` directly, so the
frozen total cannot drift without a test failure. If that assertion ever fails,
the correct response is a new ADR superseding this one — **not** a new expected
value in the test.
