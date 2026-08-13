# Mission Control — Project Context

**Document type:** Permanent project memory · single source of truth
**Audience:** Any engineer or AI assistant joining with zero prior context
**Status of this document:** Authoritative. Where this document and any other file disagree, investigate before acting.
**Last updated:** 12 August 2026

> Read this document in full before writing any code. It contains frozen
> architectural decisions and a list of known defects that must not be
> "rediscovered" or accidentally re-fixed.
>
> **7 August 2026 — BLOCKER-1 is resolved.** The Journey XP curve was frozen at
> **218,000 XP** by `docs/decisions/ADR-006-journey-xp-curve.md` (Option A).
> Progression work is no longer frozen. See §12 and §17.

---

## 1. PROJECT OVERVIEW

### What Mission Control is

Mission Control is a **personal operating system for disciplined living**. It is a
single-user application with no backend, no accounts, and no network dependency
beyond one optional weather call.

**The final product is a native Windows desktop application built with Tauri.**
It runs in the browser today, and the browser remains the development and
UI-testing surface — but planned functionality (launching with Windows, running
in the background, the system tray, notifications while closed, background
scheduling, global shortcuts, real distraction blocking) needs capabilities no
browser will grant. See §3.1b.

It is explicitly **not**:

- an RPG
- a habit tracker
- a productivity app with gamification bolted on

The distinction matters because it drives every design decision. Progression
exists to **record and celebrate disciplined living honestly** — never to
manipulate behaviour.

### Long-term vision

A lifelong record. A user should be able to open this application in ten years
and see a truthful, unbroken account of the work they did — divided into
meaningful chapters (Journeys), with permanent artefacts (Menkyo Scrolls,
Chronicles) marking each one.

The product's promise is *"my discipline has left a permanent record."* Every
engineering decision is subordinate to keeping that promise true.

### Product philosophy

The user plans a small number of things the night before, does them, and the
system records what actually happened. Everything the app tells the user about
themselves is **computed from that record**, never asserted.

Fake numbers are considered a defect of the highest severity — in a self-tracking
application, one fabricated figure contaminates trust in every real one.

### Design language

- **Theme:** Japanese craftsmanship, Zen, Bushidō. Warm charcoal, burnished gold, cinnabar seals.
- **Colour tokens:** background family `oklch(0.18 0.01 60)`, gold `oklch(0.78 0.11 82)`, gold-dim `oklch(0.6 0.08 80)`, seal red.
- **Typography:** Cormorant Garamond (display, numerals), Inter (UI). Small-caps labels at `0.28em` letterspacing.
- **Materials:** paper texture on panels, ink-brush SVG art (mountains, bamboo, pine, waves, moon), enso rings, carved hanko seals.
- **Motion:** slow and deliberate. `cubic-bezier(0.22, 1, 0.36, 1)`, 500–1800 ms. Cards lift 2 px on hover. Nothing bounces, flashes, or celebrates loudly.
- **Two surfaces:** most pages are dark charcoal; **Daily Disciplines and Journal are light washi paper (`#F2ECE1`)** — deliberate, because they are reflective spaces.
- **Chrome:** scrollbars are charcoal with gold hover (global, in `styles.css`) so browser chrome never breaks the dark theme.

### Core user experience

1. After 21:00, the app asks the user to plan tomorrow: three tasks, one objective, one intention.
2. Through the day the user ticks steps, runs focus sessions, keeps disciplines.
3. Every action appends to an immutable ledger.
4. All statistics — XP, level, rank, streak, form, records — are folded from that ledger on read.
5. Milestones produce ceremonies; Journeys produce permanent Chronicles.

---

## 2. CORE PHILOSOPHY

Every principle below is **frozen**. Changing any of them changes what the product
is. See §9 for the review requirement.

### 2.1 Event sourcing

The **Activity Ledger** is the only source of truth. It is an append-only log of
everything the user has done.

### 2.2 Derive everything, store nothing

No statistic is ever written down. XP totals, levels, ranks, streaks, hours,
records, form and unlock eligibility are all computed by folding the ledger at
read time.

*Rationale:* a stored total drifts the first time a write fails mid-flight, and
from that moment every number on screen is a rumour. Every bug in this project's
history where a page showed a stale or fake number traced back to violating this
rule.

### 2.3 Immutable history

Once written, an event is never modified. Chronicles and Menkyo Scrolls, once
generated, are never overwritten or edited.

### 2.4 Immutable XP

The awarded XP amount and its `rateVersion` are **frozen onto the event at log
time**. Rebalancing the economy affects future events only. Years of history can
never silently re-price themselves.

### 2.5 Reality over motivation

XP is awarded for completed work only. The application **must never** award XP
for: opening pages, planning tomorrow, editing tasks, reordering lists, moving
missions, reading statistics, changing settings, customising themes, writing
titles, or deleting data.

### 2.6 Undo removes, never compensates

Unticking an action **removes the event with that `ref`**. It never appends a
negative-XP compensating event — that would pollute history and break all
per-day analysis.

### 2.7 Rewards celebrate effort; collections never affect progression

Two completely independent systems:

- **System A (measurement):** Activity → Ledger → XP → Level → Master Rank → Journey → Hall
- **System B (celebration):** Achievements → Collections → Unlocks → Ceremonies → Hall

They may reference each other visually. They must never affect each other's
calculations. A cosmetic reward can never increase XP; XP can never unlock a
gameplay advantage. This is enforced structurally — `RewardDefinition` has no
`xp` field, and there is a test asserting it.

### 2.8 Form vs. Rank

Two different questions, deliberately separated:

- **Rank / level / seals / records** — lifetime, monotonic. *What you have done.* Never falls.
- **Form** — rolling 30-day XP per area against a sustainable target. *What you are doing.* Falls when you stop.

*Rationale:* cumulative "mastery" pins at 100% within weeks and then reads
identically a year after the user quits — a trophy, not a mirror. Form is
actionable; a lifetime total is not.

### 2.9 Rest earns nothing

Break and rest blocks are timed but pay zero XP. The moment breaks earn XP, the
optimal strategy becomes taking breaks and the economy starts lying.

### 2.10 Estimates are never measured hours

Only real elapsed time (focus sessions, series minutes) contributes to "total
hours". Task duration estimates are stored but deliberately excluded. This keeps
"hours" honest and preserves the ability to build estimate-calibration later.

### 2.11 Slicing a task finely must never pay more

Task value is a **fixed pot** by priority. Half is split across its steps, half is
paid on completion. Writing twelve steps instead of three cannot inflate the
reward. Steps are progress markers, not currency.

### 2.12 Three Essential Tasks

The daily task limit is **three**. The constraint is the feature. It must not
become five.

### 2.13 The 04:00 day boundary

Days roll over at **04:00 local**, not midnight. Work logged at 00:30 belongs to
the day the user experienced it as. Day plans use the same boundary so plans and
events always agree on what "today" means.

### 2.14 Frozen day key

The local day key is computed **once, at log time**, in the timezone the user was
in, and stored on the event. Travelling to another timezone can never
retroactively reshuffle which day past work belongs to.

### 2.15 A streak must be neither fakeable nor brittle

A day counts only if it clears a **Minimum Viable Day** bar. **Grace tokens**
absorb occasional misses. See §7.5.

### 2.16 State limits honestly in the UI

Where the application cannot do something, it says so plainly rather than
faking it.

**Limits are per-platform, and must be read from `platform.capabilities` rather
than asserted in prose.** Most of the list below is true of the *browser* and
will stop being true on the Windows desktop build. Copy that hardcodes "a web
page cannot…" becomes a lie in the other direction the day the desktop ships, so
gate it on the capability instead — the interface then corrects itself.

| Limit | Capability | Web | Desktop (Tauri) |
|---|---|---|---|
| Cannot block other apps or websites | `canBlockDistractions` | ✗ | expected ✓ |
| Cannot read OS-level screen time / foreground app | `canObserveSystemPresence` | ✗ | expected ✓ |
| Cannot notify once closed | `canNotifyInBackground` | ✗ | expected ✓ |
| Cannot run a timer while closed | `canScheduleInBackground` | ✗ | expected ✓ |
| Cannot start with Windows | `canAutostart` | ✗ | expected ✓ |
| Storage is a clearable ~5 MB quota | `storageIsQuotaLimited` | ✓ | expected ✗ |

**One limit is permanent and platform-independent:** YouTube has not exposed
watch history via API since 2016, and there is no OAuth scope for it. No desktop
build changes that — see `docs/09_AUTOMATIC_PROGRESS.md` §1.1.

Nothing here reaches a phone, either. A tool that governs the desktop perfectly
while the phone sits alongside should not imply otherwise.

### 2.17 Export is not optional

Years of ledger are one cleared cache away from gone. Backup is a first-class
feature, not a nice-to-have.

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Technology

| Concern | Choice |
|---|---|
| Framework | TanStack Start (file-based routing, SSR shell) |
| UI | React 19 |
| Styling | Tailwind CSS v4 (`@utility`, `@keyframes` in `src/styles.css`) |
| Language | TypeScript, `strict` + `exactOptionalPropertyTypes: true` |
| Build | Vite 8 via `@lovable.dev/vite-tanstack-config` |
| Dev server | port **8080** (fixed by the Lovable config; `.claude/launch.json` exists) |
| Persistence | `localStorage` only |
| Backend | **None.** No accounts, no sync, no server state. |

> `exactOptionalPropertyTypes: true` is significant: you cannot pass an explicit
> `undefined` to an optional prop. Use conditional spreads
> (`...(x === undefined ? {} : { x })`) rather than `x: undefined`.

### 3.1a Environment constraints — read before touching tooling

- **This working copy is not a git repository.** `git rev-parse` fails. There is no version control safety net locally: an overwritten file is gone. Read before you write, and never overwrite a file you have not read.
- **The project is linked to Lovable** (see `AGENTS.md`). If version control is later initialised, do **not** rewrite published history — no force-push, rebase, amend or squash of pushed commits, as that rewrites history on Lovable's side and can destroy project history.
- **Package manager:** a `bun.lock` is present, but `npm` and `npx` work and are what every command in this document assumes.
- **Dev server:** port **8080**, fixed by the Lovable Vite config (`strictPort`). Start it through the preview tooling using the existing `.claude/launch.json` entry (`mission-control-dev`) — never as a raw background shell command.
- **Verification style:** this project's UI has been verified by reading computed styles and the DOM via the browser tooling, because the preview pane has frequently been unable to composite frames (screenshots time out). If a screenshot fails, that is the known cause; fall back to DOM/computed-style assertions rather than assuming the page is broken.

### 3.1b The target platform is the Windows desktop

**Mission Control's final product is a native Windows application built with
Tauri.** The browser is the development and UI-testing surface — useful, fast to
iterate in, and where the app runs today — but it is not the destination.

This was settled on 10 August 2026 and it is a direction, not a schedule: no
Tauri, Electron or Rust code exists in the repository yet, and none should be
added until a feature needs it. What changed is that browser-only solutions are
no longer acceptable for functionality that ultimately requires native
capabilities. Build against the platform contract; do not build a browser
workaround that is known in advance to be thrown away.

Planned functionality that **requires** the desktop build, and must not be faked
in the browser: launching with Windows, running in the background, system-tray
operation, native notifications while closed, background scheduling, global
shortcuts, and any real distraction blocking.

The layering is:

```
UI (components, routes)
  ↓
Application logic (hooks)
  ↓
Services / data access   (src/services/store.ts — key registry, JSON helpers)
  ↓
Platform adapter         (src/platform/ — storage, notifications, geolocation,
                          presence, files)
```

**Rules that hold from here on:**

1. Application code never touches `localStorage`, `Notification`, `navigator`,
   `document.visibilityState`, `Blob` or `URL.createObjectURL` directly. It goes
   through `@/platform` or `@/services/store`.
2. `src/data/**` stays pure. No browser globals, no I/O, no React — it must be
   runnable from a plain script, which is exactly how the test suites use it.
3. The platform contract is **async**, because every storage API a desktop build
   would use is. A synchronous contract would have to be unpicked later.
4. What the platform can and cannot do is **data** (`PlatformCapabilities`), not
   prose. The honest limits in §2.16 are true of the *web* platform; a desktop
   build changes them, and the UI should read the capability rather than
   hardcode the limitation.
5. Adding a new persistent store means adding a key to `KEYS` in
   `services/store.ts` — which is also what makes it eligible for backup.
6. **Gate on capability, never on brand.** Ask
   `platform.capabilities.canScheduleInBackground`, not "am I in Tauri?". A
   capability flag may exist before its adapter does — that is deliberate, so the
   UI can say "this needs the desktop app" instead of offering a button that
   quietly does nothing.
7. **Business logic never moves into Rust.** Anything that can be expressed in
   TypeScript stays in TypeScript. Rust is for what only the OS can do — tray,
   autostart, window hooks, blocking — not for XP, ledgers or scheduling maths.

**Do not** add dependencies that assume a browser-only environment, or that
would be awkward to bundle into a Tauri build.

**Where the desktop build plugs in:** `platform/index.ts` has a single commented
branch in `selectPlatform()`. The desktop work is a `platform/tauri/` directory
implementing the same contracts, a capabilities block, and uncommenting that
line. No application code changes.

### 3.2 Data flow

```
User action
   ↓
Ledger event appended (XP + day + tz frozen)
   ↓
useActivity  →  deriveStats()  →  XP · streak · form · records
   ↓
useProgression → progressionFor() → level · rank · Journey
   ↓                              → Reward Engine → unlocks
   ↓
Ceremony queue → overlay
   ↓
All pages read derived values
```

### 3.3 Subsystems

**Activity Ledger** — `src/data/activity.ts`, `src/hooks/use-activity.tsx`
Append-only event log. Owns the event schema, the XP economy constants, streak
logic, form logic, and the single `deriveStats()` fold. Provides `log`, `unlog`,
`toggle`, `has`, `replaceAll`, `clear`, plus `writeError` and `usage` for
storage safety. Runs an integrity pass on load that removes duplicate refs.

**XP Engine** — inside `activity.ts`
Pure summation of frozen per-event XP. Never recomputes, never rebalances.

**Progression Engine** — `src/data/progression.ts`
Pure and deterministic. Owns the XP curve, cumulative level table, 10 Master
Ranks, Journey derivation, promotion detection. Stores nothing. `activity.ts`
re-exports from here so nothing bypasses it.

**Journey Engine** — inside `progression.ts` + `src/data/chronicle.ts`
Journey = 100 levels. Completed Journeys derived as `floor(lifetimeXP /
JOURNEY_XP)`. Chronicle and Menkyo generation replays the ledger.

**Reward Engine** — `src/data/rewards.ts`
Reads level, Journey and achievement counts; emits unlock state. Structurally
incapable of affecting progression.

**Celebration layer** — `src/hooks/use-progression.tsx`
The only place progression-adjacent state is persisted: acknowledged promotions,
unlock timestamps, Chronicles, Menkyo Scrolls, equipped cosmetics. Deleting this
store changes no statistic — only the record of what the user has already *seen*.

**Hall of Mastery** — `src/routes/hall-of-mastery.tsx`
Pure presentation over derived values. Lifetime stats, rank medallion, journey
timeline dated by ledger replay, rolling form, seals, achievements, records,
Collections, Menkyo shelf.

**Focus Engine** — `src/routes/focus.tsx`, `src/hooks/use-distraction-shield.ts`
Wall-clock timer (never tick counting), Pomodoro cycle, session persistence
across reload, Page Visibility–based presence tracking that scales XP.

**Planning System** — `src/data/plan.ts`, `src/hooks/use-day-plan.ts`, `NightlyPlanner.tsx`
Per-calendar-day plans: three tasks, objective, intention, timeline.

**Series & Courses** — `src/hooks/use-series.ts`, `src/lib/youtube.ts`, `SeriesTracker.tsx`
Work through a playlist or course one piece a day. Optional YouTube Data API
import of episode lists.

**Journal** — `src/routes/journal.tsx` · per-date entries, own storage key.
**Missions** — `src/routes/missions.tsx` · Kanban board, own storage key.
**Daily Disciplines** — `src/routes/disciplines.tsx`, `src/data/disciplines.ts` · fully ledger-derived.
**Calendar / Fitness / Projects / Academy** — sample data, see §5.
**Settings** — `src/routes/settings.tsx` · export/import, YouTube key, economy explained in plain language.
**Insights** — placeholder. See §6.

---

## 4. COMPLETED FEATURES

### 4.1 Home — `/`

| Feature | Notes |
|---|---|
| Time-aware greeting | Five bands: Rest Well (<05:00), Morning, Afternoon, Evening, Good Night (≥21:00). Re-checks each minute. |
| Three hero moods | Plate + colour grade shift by hour (dawn / midday / dusk / night). Uses the two existing image assets re-graded — **no new images were generated**. |
| Daily proverb | 14 proverbs, kanji + romaji + translation, rotating daily. |
| Live weather | Browser geolocation → Open-Meteo (keyless). WMO code → label + icon. **Location is deliberately never displayed.** |
| Today's Intention | Editable, saved per calendar day. |
| Main Objective | Progress = steps ÷ total. 道 enso ring *is* the gauge. |
| Three Essential Tasks | Step checklists, priority pills with meanings, drag reorder, gold strike-through on completion. |
| Focus Timeline | Status derived from the real clock; live "Now" badge, in-block fill, "Next 06:00" header. |
| Plan Tomorrow | Auto-appears after 21:00; sets tasks/objective/intention for **tomorrow's** date; auto-sorts Critical → High → Standard. Optional desktop notification. |
| Rank & Progression cards | Level, XP, streak — all derived; captions adapt to real state. |
| Daily philosophy | 61 quotes, exhaustive no-repeat cycle, "Keep this" favourites with a Kept Words panel. |

### 4.2 Focus — `/focus`

- **Wall-clock timer.** Anchored to absolute timestamps. Survives tab-switching, throttling, sleep, and full page reload mid-session.
- **Pomodoro cycle.** Four work blocks earn a long rest; auto-advances; cycle dots.
- **Distraction Shield.** Page Visibility API counts departures, measures time away, computes **presence** (time present minus 4%/departure, capped 40%), which **scales session XP**.
- **Focus XP decay.** Tiers by minutes already focused that day.
- **Finish early** banks only minutes genuinely worked; **Reset** discards.
- **Series & Courses** tracker with YouTube playlist import.
- Stats derived from history; shows "—" at zero rather than inventing values.

### 4.3 Daily Disciplines — `/disciplines`

Definition/state separation: a discipline's definition is durable; **completion is
a dated ledger event**. The board resets itself each day because no events exist
for today yet — there is no reset logic to forget.

Derived: weekly/monthly consistency (excluding days before first use), both trend
sparklines, current streak, personal best, per-card streaks.

### 4.4 Hall of Mastery — `/hall-of-mastery`

Lifetime XP, longest streak, total measured hours, seals unlocked, rank
medallion, journey timeline **dated by ledger replay**, rolling 30-day form with
decay hints, 12 seals with real predicates, 10 achievements, milestones, personal
records, Collections shelf, Menkyo shelf.

### 4.5 Settings — `/settings`

Ledger summary, **Export Everything** (all 7 keys), **Restore From File** (merges,
never overwrites), YouTube API key field, and the entire economy stated in plain
language with the live rate version.

### 4.6 Cross-cutting

- **Ceremonies** — level-up toast (2 s), promotion (10-step sequence, 6–10 s), Journey completion (20–30 s with Chronicle summary). Escape skips. Acknowledgement persisted by id; never replays.
- **Collections UI** — 10 categories, earned/locked, progress to locked items, earned dates, equipping.
- **Storage safety** — `safeWrite` reports failure; a blocking alert with one-click export appears when writes fail, and a warning at 70% usage.
- **Custom icon set** — 16 hand-drawn Japanese SVG glyphs (`JapaneseIcons.tsx`).

---

## 5. PARTIALLY COMPLETED FEATURES

### 5.1 Missions — `/missions`

**Works:** create missions, drag-and-drop across Inbox/Today/Upcoming/Completed,
subtasks, delete, live search, category and priority filters, three views, detail
inspector. Persists to `mission-control-missions-v3`.

**Does not:** earns **no XP** — completing a mission never touches the ledger, so
it does not affect level, form or streak.

**Technical debt:** calendar defaults to **day 17** (a leftover from the mockup
date). Contains most of the project's 35 pre-existing type errors. Lives entirely
apart from Home's essential tasks — two parallel task systems.

**Required work:** log to the ledger; fix the day-17 default; unify with the day
plan (Missions as the store, day plan holding `taskId` references).

### 5.2 Journal — `/journal`

**Works:** genuine per-date journal — reflection, lessons, three gratitudes,
tomorrow's intention, notes, three ideas, weekly/monthly reflection, mood tracker
with per-day storage and a week strip. Persists to `mission-control-journal-db`.

**Earns XP — wired to the ledger 11 August 2026.** Writing anything logs a
`journal` event (`journal:<date>`, spirit, 30 XP — a rate already in the frozen
economy, so nothing changed). Spirit form is no longer permanently zero.

The condition is deliberately **writing**, not touching: opening the page pays
nothing, and setting a mood pays nothing, because §2.5 permits XP for completed
work only. Emptying an entry removes the event (§2.6 — removal, never a
compensator). The ref is keyed on the *entry's* date, so an entry is worth
exactly one event however many times it is edited, and backfilling last Tuesday
credits last Tuesday. The event's own `day` stays frozen at log time (§2.14) —
you did the writing today, and that is what feeds the streak.

**Required work:** no search or export across entries.

### 5.3 Academy — `/academy`

**Works (in memory only):** rotate quote, drag to reorder courses, resume course,
start assignment, revise exam, select book, resume reading, search.

**Does not:** **contains zero `localStorage` calls.** Every change is lost on
refresh. All statistics are sample data.

**Required work:** persistence first, then ledger integration.

### 5.4 Fitness — `/fitness` — **persisted and earning (11 August 2026)**

**Works:** the exercise list and today's ticks persist (`mission-control-fitness-v1`,
included in backup). Finishing every exercise logs one `workout` event for the day
at the already-frozen 80 XP — so **Body form is live**, having been permanently
zero. Unticking removes the event (§2.6). The weekday is real (fixed 7 August).

**The model, deliberately:** the exercise list is a *plan*; whether you trained is
a *ledger event*; individual ticks are a *cursor* holding today only. Ticks feed no
statistic, so they cannot desynchronise from anything — and yesterday's ticks are
not kept, because the event is already the record.

**Stat tiles are now derived** — sessions this week, training streak, lifetime
sessions, Body form. They previously read 4 sessions, a 23-day streak, 18.4k kg
and 82% recovery, none of which had any source. The six-week chart now plots real
sessions per week.

**Does not:** exercises are not user-editable yet (the list is a sensible default,
persisted once changed programmatically). Body metrics — weight, body fat, resting
HR, sleep — read "—" and say plainly that nothing measures them, because nothing
does.

### 5.5 Projects — `/projects`

**Works:** stage filters, selection drives the detail panel, enso ring and
milestone checklist, stat tiles computed from the project list.

**Does not:** all five projects are sample data. No add/edit/delete, no
persistence, no XP.

### 5.6 Calendar — `/calendar` — **now derived (7 August 2026)**

**Works:** correct Monday-first month grid from real date maths, prev/next/Today,
today highlighted only in the current month, day selection, "+N more" overflow —
and the contents are now **real**. `deriveCalendar()` in `src/data/calendar.ts`
folds three existing sources into one month view:

| Source | Contributes |
|---|---|
| Activity Ledger | what actually happened — focus, tasks, objectives, workouts, disciplines, journal, study |
| Day plans | what is committed — timeline blocks (timed), tasks and the objective (untimed) |
| Mission due dates | what falls due, resolved against the viewed year |

**The rule it enforces:** past is what happened, future is what is committed. A
past day reads from the ledger only — the plan you wrote that morning is not
evidence you did it — so a stale plan can never masquerade as an achievement. A
future day reads from plans only. Today shows both, and every row is labelled
*done* or *planned*.

`subtask` and `focus-bonus` events are excluded on purpose: a step is progress
*within* a task, and listing every tick would bury the day it belongs to.

**No calendar store exists, and none must be created.** That was the instruction
in the original version of this section and it still holds — a parallel store is
exactly what produced the old bug, in which thirteen sample events reappeared
identically in every month of every year.

**Still to do:** creating or editing events from this page. Anything added here
must write to the *source* — a day plan or a mission — never to a calendar of its
own.

### 5.7 Insights — `/insights`

Placeholder only. See §6 for the planned content — this is the highest-value
unbuilt page.

---

## 6. REMAINING ROADMAP

### Highest priority

1. ~~**Freeze the XP curve.**~~ **Done 7 August 2026** — ADR-006, Option A.
2. ~~**IndexedDB migration.**~~ **Withdrawn 10 August 2026 — ADR-007.** The storage ceiling is solved by the desktop build's filesystem, not by a browser store that would be thrown away. Do not build it.
3. ~~**Eliminate duplicate state** — `Subtask.done` and `Episode.doneOn`.~~ **Done 7 August 2026.**

### High

4. ~~Wire **Journal** to the ledger.~~ **Done 11 August 2026** — Spirit form is live.
   Wire **Missions** to the ledger — *but see the warning below before doing it.*

   > **Do not wire Missions at the full task pot until the two task systems are
   > unified (item 10).** Missions and the day plan are parallel systems (§5.1),
   > so paying both the frozen task rate creates a double-count path: the same
   > work entered in both places pays twice. That is the §2.11 exploit wearing a
   > different hat. Either unify first, or decide a rate in an ADR — do not
   > reach for `TASK_POT` and assume it is safe.
5. Caching layer for `deriveStats`. (`firstDayMeeting` was rewritten as a single pass on 7 August 2026; the general memoisation layer is still outstanding.)
6. ~~Fitness → ledger.~~ **Done 11 August 2026** — Body form is live. Still to do: user-editable workouts.
7. ~~Fix `focus-bonus` substring coupling.~~ **Done 7 August 2026.**

### Medium

8. Academy persistence.
9. Projects CRUD, and Calendar *editing* (the Calendar is now derived — anything added there must write back to a day plan or a mission, never to a calendar store).
10. Unify the two task systems.
11. Editable focus-timeline blocks; do/defer/drop triage in Plan Tomorrow.
12. Equipped cosmetics must actually change the appearance.

### Low

13. Weekly Chronicle (progression Loop Two).
14. ~~Move user name out of `data/mission.ts` into Settings.~~ **Done 7 August 2026.**
15. Mobile layout — the sidebar is `hidden lg:flex`, so the app is unusable below 1024 px.
16. Accessibility pass — focus traps in ceremonies, contrast on `text-muted-foreground/60`, keyboard paths for drag-and-drop.
17. ~~Clear the 35 type errors and 286 formatting errors~~ **Done 7 August 2026** — both are zero and `npm run check` gates them. Adding CI still pending, and needs version control first.
18. Delete the four dead Mission components once there is version control to undo it.

### Future ideas — the Insights page

All derivable from the existing ledger; no new tracking required.

1. **Estimate calibration** — planned estimates and measured focus time are stored separately and never mixed, specifically so this can be built. Surface a personal multiplier and warn at planning time: *"You've planned 6h into a day where you historically complete 3.2h."* Highest-value feature available from data already held.
2. **Priority honesty** — completion rate by priority. Critical at 45% and Standard at 90% means avoidance-tasking.
3. **Peak hours** — XP and completions by hour of day.
4. **Decay alerts** — "Body: 14 days since last log."
5. **Objective hit rate by weekday.**
6. **Plan-vs-actual drift.**
7. **Weekly value rating** — one question, "How valuable was this week?" 1–5, plotted against weekly XP. This is the system's error-correction term: XP can measure whether you did a lot; only the user can say whether it mattered.

---

## 7. PROGRESSION SYSTEM

### 7.1 XP philosophy

XP represents disciplined effort invested in meaningful personal growth. It does
not measure intelligence, talent, success, income, grades or luck. Lifetime XP is
monotonic and never decreases.

### 7.2 The economy — FROZEN

**Tasks — fixed pot.** Half split across steps, half on completion.

| Priority | Total | Across steps | On completion |
|---|---|---|---|
| Critical | 200 | 100 | 100 |
| High | 140 | 70 | 70 |
| Standard | 80 | 40 | 40 |
| Daily objective | 150 | 75 | 75 |

*Verified:* a Critical task pays ~200 whether written as 3 steps (199) or 20 (200).

**Focus — decaying curve**, by minutes already focused that day:

| Minutes that day | Multiplier |
|---|---|
| 0–120 | ×1.00 |
| 120–240 | ×0.75 |
| 240+ | ×0.50 |

An 8-hour day yields **330 XP, not 480**. Three completed Critical tasks (600)
correctly beats an eight-hour sit (330).

**Other rates:** discipline 15 · journal 30 · series episode 30 · workout 80 ·
focus→task same-day completion bonus +25% of that focus, logged as its own
removable event.

**`RATE_VERSION = 2`.** Bump when rates change; existing events keep their version.

### 7.3 Levels — FROZEN (ADR-006, 7 August 2026)

The cost of a level rises **linearly**, 1,000 XP at level 1 to 3,400 at level 99,
interpolated smoothly between milestones. One Journey is **exactly
`JOURNEY_XP = 218,000`**.

| Level | XP to next | | Level | XP to next |
|---|---|---|---|---|
| 1 | 1,000 | | 60 | 2,450 |
| 10 | 1,220 | | 70 | 2,690 |
| 20 | 1,470 | | 80 | 2,940 |
| 30 | 1,710 | | 90 | 3,180 |
| 40 | 1,960 | | 99 | 3,400 |
| 50 | 2,200 | | | |

*Verified:* a Journey takes 0.75 years at a strong pace (~800 XP/day) and 1.33
years at a conservative one (~350–450), centring near one year. `JOURNEY_XP` is
asserted in `progression-tests.ts` so it cannot drift silently.

The previous table (1,000 → 18,000, `JOURNEY_XP = 772,300`) priced a Journey at
2.6–4.7 years and was replaced. Full reasoning and the two rejected options are
in `docs/decisions/ADR-006-journey-xp-curve.md`.

### 7.4 Master Ranks — FROZEN

Ten ranks in clean 10-level bands. Verified to tile 1–100 with no gaps.

| Levels | Kanji | Name | Meaning |
|---|---|---|---|
| 1–10 | 初心 | Shoshin | The Beginner's Mind |
| 11–20 | 弟子 | Deshi | The Disciple |
| 21–30 | 修行 | Shugyō | The Path of Discipline |
| 31–40 | 剣士 | Kenshi | The Swordsman |
| 41–50 | 武士 | Bushi | The Warrior |
| 51–60 | 達人 | Tatsujin | The Master |
| 61–70 | 名人 | Meijin | The Great Master |
| 71–80 | 宗師 | Sōshi | The Grand Teacher |
| 81–90 | 無双 | Musō | Without Equal |
| 91–100 | 守破離 | Shu-Ha-Ri | Obey. Break. Transcend. |

Shu-Ha-Ri is deliberately **not a rank** — it is the philosophy concluding a
Journey. There is no higher title.

Promotions fire at **11, 21, 31, 41, 51, 61, 71, 81, 91** — nine per Journey.

### 7.5 Streaks — FROZEN

**Minimum Viable Day.** A day counts if any one holds:
- ≥25 minutes measured focus, **or**
- the daily objective completed, **or**
- ≥100 XP earned

**Grace tokens.** One earned per 7 unbroken days, maximum 2 held. A missed day
spends one and renders as *recovered*, visually distinct from earned.

*Verified:* 17 days containing one missed day yields a streak of **18, not 4**,
with 1 token remaining.

### 7.6 Form — FROZEN

Rolling 30-day XP per area against a sustainable target.

| Area | 30-day target |
|---|---|
| Discipline | 1,500 |
| Mind | 1,200 |
| Body | 1,000 |
| Knowledge | 1,200 |
| Spirit | 600 |

Area assignment: focus → mind; workout → body; study/series → knowledge;
journal → spirit; discipline/task/objective → discipline (tasks refine by icon
via `areaForIcon`).

### 7.7 Journeys

100 levels. Completion awards one Menkyo Scroll and one Chronicle, then Journey
+1 begins. **Nothing resets** except current level and Journey progress — lifetime
XP, records, Hall, collections and achievements all persist.

Display rule: never show "Level 948". Show **"Journey 9 · Bushi · Level 47"**.

### 7.8 Collections & Reward Engine — FROZEN

Ten collections: Enso, Washi, Mountain, Moon, Hanko, Philosophy Frames, Ambient
Themes, Hall Decorations, Journey Scrolls, Ceremonial Seals.

38 rewards on the rhythm: every 5 levels a cosmetic · every 10 a major unlock ·
every 25 a legendary · level 100 the Menkyo Scroll.

Two categories: **Progression rewards** (predictable, level-gated) and **Mastery
rewards** (earned by accomplishment, never by levelling).

Rules: permanent, never expire, never randomised, no loot boxes, no probability,
no paid unlocks, one deterministic requirement each.

### 7.9 Ceremonies

- **Level-up** — 2 s ink-splash toast.
- **Promotion** — 6–10 s: fade, draw enso, reveal kanji, title, meaning, quote, press hanko, unlock, continue.
- **Journey completion** — 20–30 s with Chronicle summary and Menkyo award.

All skippable (Escape), none disableable, none ever repeats — acknowledgement is
persisted by id.

### 7.10 Menkyo Scrolls & Chronicles

Generated automatically from the ledger. **No AI. No editing.** Immutable
historical certificates. Exactly one of each per Journey.

---

## 8. ACTIVITY LEDGER

### 8.1 Event model

```ts
type ActivityEvent = {
  id: string          // crypto.randomUUID() — merge identity
  ref: string         // action identity, e.g. `subtask:2026-08-05:t1:t1-s0`
  kind: ActivityKind  // subtask | task | objective | focus | focus-bonus
                      // | workout | discipline | journal | study
  area: Area          // discipline | mind | body | knowledge | spirit
  xp: number          // FROZEN at log time
  rateVersion: number
  at: string          // ISO UTC
  day: string         // local day key at the 04:00 boundary, FROZEN
  tz: string          // IANA zone at log time
  minutes?: number    // measured time only
  taskId?: string     // the planned task this belongs to, when it has one
  label: string
}
```

`taskId` is identity, not description. The focus completion bonus binds to it, so
renaming a task cannot redirect XP. Events logged before it existed have no
`taskId` and simply claim no bonus.

**`id` vs `ref` — the distinction matters.** `id` is unique per event and is the
merge key. `ref` identifies the *action* and is the dedupe key. Two events may
never share a `ref`.

### 8.2 Storage keys

| Key | Contents |
|---|---|
| `mission-control-activity-v1` | The ledger |
| `mission-control-progression-v1` | Acknowledged promotions, unlock timestamps, Chronicles, Menkyo, equipped |
| `mission-control-day-plans-v1` | Per-day plans |
| `mission-control-series-v1` | Series and courses |
| `mission-control-focus-session-v1` | In-flight focus session |
| `mission-control-favourite-quotes-v1` | Kept quotes |
| `mission-control-missions-v3` | Kanban missions |
| `mission-control-journal-db` | Journal entries by date |
| `mission-control-youtube-key-v1` | YouTube Data API key |
| `mission-control-profile-v1` | The user's name (JSON-encoded string) |
| `mission-control-fitness-v1` | Exercise list + today's session cursor |

`mission-control-daily-disciplines-v2` is **legacy and no longer read**.

### 8.3 Undo

`unlog(ref)` filters out the event with that ref. Never appends a compensator.

### 8.4 Import

`mergeLedgers(current, incoming)` — two passes, **both required**:

1. **Union by `id`** — merge identity; two devices union without conflict.
2. **Collapse by `ref`**, keeping the **earliest** — prevents one action counting twice after undo/re-tick, and prevents an import from moving when something happened.

`dedupeLedger()` runs on load as an integrity pass, repairing ledgers corrupted by
the pre-fix merge and logging what it removed.

### 8.5 Replay

`deriveStats(events, today)` is the single fold. Verified order-independent across
200 shuffled events and identical on repeat.

### 8.6 Caching

**None exists.** The only cached artefact is the module-level `CUMULATIVE` level
table in `progression.ts`, which the specification explicitly permits.

### 8.7 Guarantees (all verified by test)

- Undo returns XP exactly; no negative-XP events.
- Duplicate refs impossible after merge; re-import idempotent.
- Level/rank/Journey identical after deleting all derived stores.
- Deterministic: same ledger → same output, always.
- Legacy events migrate without altering awarded XP.

---

## 9. DO NOT CHANGE WITHOUT ARCHITECTURAL REVIEW

1. The Activity Ledger is the only source of truth.
2. Derive everything; store nothing.
3. XP is frozen on the event with a `rateVersion`.
4. The day key is frozen on the event at log time.
5. Undo removes the event by `ref`; it never compensates.
6. The 04:00 day boundary (used by both ledger and plans).
7. `id` = merge identity (UUID); `ref` = action identity. Merge must dedupe by **both**.
8. Rewards can never affect XP, form, streak or progression speed. `RewardDefinition` must never gain an `xp` field.
9. Lifetime XP is monotonic; Form is the only thing that falls.
10. Rest earns nothing; estimates are never measured hours.
11. Task value is a fixed pot — slicing finely must never pay more.
12. Three Essential Tasks. Not five.
13. Minimum Viable Day + grace tokens — a streak must be neither fakeable nor brittle.
14. Chronicles and Menkyo Scrolls are immutable, generated without AI, one per Journey.
15. Each event belongs to exactly one Journey.
16. Ceremonies never replay after acknowledgement.
17. No randomness anywhere in progression. No loot boxes, no probability, no paid unlocks.
18. Honest UI: never fake a capability the platform does not have.
19. Export must always work and must include every store.

---

## 10. CURRENT IMPLEMENTATION STATUS

| Subsystem | Complete | Health | Known issues | Next task |
|---|---|---|---|---|
| Activity Ledger | 95% | 88 | No caching | Per-day index |
| XP Engine | 100% | 95 | — | — |
| Progression Engine | 95% | 90 | Curve frozen (ADR-006) | — |
| Journey Engine | 85% | 80 | Completion ceremony untested at runtime; now reachable at 218k XP | Seed-test a completion |
| Reward Engine | 90% | 88 | Equipped cosmetics have no visual effect | Wire equipping |
| Ceremonies | 95% | 92 | — | Runtime-test the Journey ceremony |
| Hall of Mastery | 92% | 88 | Reads one memoised timeline; `deriveStats` itself still uncached | General memoisation |
| Focus Engine | 95% | 95 | — | — |
| Planning System | 90% | 88 | Two task systems still parallel to Missions | Unify with Missions |
| Daily Disciplines | 95% | 92 | Definitions not user-editable | Editable definitions |
| Series | 85% | 88 | — | User-editable episode lists |
| Journal | 85% | 90 | No search or export across entries | Search + export |
| Missions | 75% | 72 | No XP; two task systems still parallel | Log events; unify with day plan |
| Settings | 90% | 92 | — | — |
| Academy | 30% | 25 | **No persistence at all** | Add storage |
| Fitness | 65% | 80 | Exercises not user-editable; body metrics have no source | Editable workouts |
| Projects | 30% | 35 | Sample data, no persistence | CRUD + storage |
| Calendar | 70% | 85 | Read-only; no editing from this page | Create/edit writing back to plans and missions |
| Insights | 0% | — | Placeholder | Estimate calibration |

---

## 11. CURRENT TECHNICAL DEBT

### Critical

**~~TD-1 — Duplicate state: task completion.~~ FIXED 7 August 2026.**
`Subtask.done` is gone. Completion is `has(planRef.taskSubtask(day, taskId,
subtaskId))` — the ledger and nothing else. `subtaskProgress()` and
`isTaskComplete()` now take a `StepDone` predicate rather than reading a stored
flag, and the ref builders live in `planRef` so writer and readers cannot drift
apart. *Verified in the running app:* with `mission-control-day-plans-v1`
holding literally `{}`, ticked steps still survive a reload.

**~~TD-2 — Duplicate state: series episodes.~~ FIXED 7 August 2026.**
`Episode.doneOn` is gone. `episodeCompletions(events)` builds the ref → day
lookup from the ledger, and the day an episode was finished is now that event's
frozen day key. `setEpisodeDone` was deleted outright — there is nothing left to
write to.

**TD-3 — Storage ceiling.** ~271 bytes/event × ~50 events/active day ≈ **4.7 MB in
year one** against a ~5 MB `localStorage` quota. The alert warns and blocks
silently-lost work, but the ceiling remains **while running in a browser**.
*Fix (decided, ADR-007):* the Windows desktop build writes to a real file behind
the existing `StorageAdapter`. IndexedDB is **withdrawn** — it keeps every
problematic property of browser storage and is discarded on the desktop build.
Deferring is safe only because failure here is loud and recoverable: writes
report failure, the alert blocks, and export is one click. **The trap to avoid:**
WebView2 *has* localStorage, so the desktop app would run unmodified and silently
keep the quota. Swapping the adapter must be a deliberate step in that work.

### Major

**TD-10 — Series credit *estimated* minutes as measured time.** `use-series.ts`
declares `minutesPerEpisode` (defaulting to **12** for YouTube imports, **20**
for manual ones) and `SeriesTracker.tsx` logs it as the `minutes` on a `study`
event, which flows into "Total Hours". That is a guess counted as measurement,
contradicting §2.10 — *only real elapsed time contributes to total hours*. A
90-minute lecture books 12 minutes; ten short clips book 120.
*Fix:* import real `contentDetails.duration` from the Data API (cheap), or log
seconds actually played via the IFrame player (correct). See
`docs/09_AUTOMATIC_PROGRESS.md` §5.

**TD-4 — No caching layer.** Every fold still walks the full array on every
change, so this is not closed. The worst offender is gone, though: the Hall's
`firstDayMeeting` was O(days² × events) *per predicate*, re-derived inside each
of eighteen seal and milestone tests, three times per render. It now reads from a
single `buildStatsTimeline(events)` pass memoised for the page, and each
predicate is a linear scan over one point per day. *Still to do:* a general
memoisation layer for `deriveStats` itself, which is what 100k events will need.

**~~TD-5 — `focus-bonus` couples by substring.~~ FIXED 7 August 2026.**
`ActivityEvent` gained an optional `taskId`, stamped when a focus session is
banked, and the bonus now matches on it. *Verified:* a 500 XP session belonging
to another task but whose label contains the target task's exact title no longer
contributes — the bonus came out at 25 XP, not 150. Focus events logged before
this change carry no `taskId` and so claim no bonus; the only ledger in
existence was test data.

**~~TD-6 — Progression derived twice.~~ FIXED 7 August 2026.**
`progression`, `rank` and `nextRank` are gone from `MasteryStats`;
`useProgression()` is now the single access path. Predicates that need the level
receive it through `EarnContext` (`MasteryStats & { level: number }`) rather than
finding it inside the stats object.

**~~TD-7 — `acknowledgeCeremony` recomputes.~~ FIXED 7 August 2026.**
It now switches on the `pendingCeremony` it was given, taking identity from the
ceremony and level from the same render. A ceremony the user never saw can no
longer be marked seen. Acknowledging a Journey also resets `acknowledgedLevel`
to the new Journey's level, which the old code did only incidentally.

**~~TD-8 — Unlock effect writes state it depends on.~~ FIXED 7 August 2026.**
The newly-unlocked set is computed inside the `setStore` updater against `prev`,
so `store.unlocks` left the dependency array. Returning `prev` unchanged makes
React bail out — it now terminates by design rather than by guard.

**~~TD-9 — 35 type errors and 286 formatting errors.~~ FIXED 7 August 2026.**
Both are now **zero**. `tsc --noEmit` is clean and `eslint src scripts` reports no
errors (10 `react-refresh` warnings remain, which are advisory only). Root causes
were mostly `array[i]` and `.split("T")[0]` yielding `T | undefined` under
`noUncheckedIndexedAccess`, plus three `any`s and a stale `MissionCategory`
union. `npm run check` runs typecheck + lint + both suites as one gate — wire
that into CI when version control exists.

### Minor

- Equipped cosmetics are persisted but never read (dead state).
- `activity.ts` exports both the legacy flat `XP` rates and the pot model.
- Unvalidated casts: `migrateEvent` casts `kind`; `restoreBackup` casts parsed JSON.
- ~~`Ceremony.tsx` `handleClose` sets a timeout with no unmount cleanup.~~ **Fixed 7 August 2026** — held in a ref, cleared on unmount, and a second dismissal during the fade is ignored.
- Naming drift: `masterRank`/`rank`, `currentLevel`/`levelWithinJourney`.
- `defaultDisciplines` is a fixed const; definitions should be user-editable.
- `rankForLevel(100)` used as a stand-in for the Journey ceremony's rank.
- **Dead components:** `MissionsBoard.tsx`, `MissionDialogs.tsx`, `MissionsList.tsx` and `MissionCard.tsx` are imported nowhere — leftovers from an earlier Missions design superseded by the inline board in `missions.tsx`. Their types were corrected rather than deleting them, because this working copy has no version control. Delete once history exists.

### Future

- No backend, accounts or sync. The append-only ledger with stable ids is already the correct shape — set union merges cleanly. **Protect this property.**
- No mobile layout.
- No automated accessibility testing.

---

## 12. CURRENT BLOCKERS

### ~~BLOCKER-1 — The Journey XP curve~~ — **RESOLVED 7 August 2026**

Resolved as **Option A**: the Journey is frozen at **218,000 XP** with a linear
1,000 → 3,400 curve. See `docs/decisions/ADR-006-journey-xp-curve.md` and §7.3.
Progression work is unblocked. The analysis below is retained as the record of
why.

Three specification statements could not all be true:

| Constraint | Implied Journey length |
|---|---|
| Milestone table as written (implemented) → `JOURNEY_XP = 772,300` | **2.6 – 4.7 years** |
| Spec's pacing bands (2–4 / 5–7 / 8–12 days per level) × 100 levels | ~1.75 years |
| Spec's stated duration "≈200,000 XP ≈ one Journey", 10–14 months | ~1 year |

Constraints 2 and 3 contradict each other **independently of the implementation**:
34 late levels at 8–12 days each consume 272–408 days by themselves.

Measured economy: ~800 XP on a strong day, ~450 realistic average → 164,000–290,000
XP/year. **The spec's ~200,000 estimate is sound; the milestone table is wrong by
roughly 3.5×.**

**Options presented to the product owner:**

- **A — CHOSEN:** retarget to ≈218,000 XP/Journey with a 1,000 → ~3,400 curve. Journey ≈ 1 year. Pacing lands inside or adjacent to every band. Required updating the progression spec.
- **B:** keep the table; accept 3–4 year Journeys; remove "one year" language and reframe Journeys as multi-year eras.
- **C:** raise the economy ~3.5×; keeps table and duration but rewrites the deliberately-tuned task pot and focus curve.

**Why this blocks everything:** every reward threshold, promotion level, ceremony
trigger, collection unlock and Hall timeline entry is a function of the curve.
Chronicles are immutable, so any Journey completed under the wrong curve records a
boundary that later moves. Changing it after real data exists invalidates the
progression architecture.

**Status: decided (Option A) and applied on 7 August 2026, while the only ledger
in existence was still test data. No Chronicle was ever generated under the old
curve.**

### ~~BLOCKER-2 — Storage ceiling~~ — **RESOLVED 10 August 2026**

Answered by ADR-007: the Windows desktop build writes to the filesystem. Not
blocking development, and no longer blocking release either — release is the
desktop build. See TD-3.

### BLOCKER-3 — No backend (product-scope only)

There is no path to multi-device, account recovery, or more than one user.
Relevant only if the product is intended for distribution.

---

## 13. KNOWN BUGS (still present)

1. ~~**Duplicate state desync**~~ — TD-1, TD-2. **Fixed 7 August 2026**; there is no second writer left to disagree.
2. ~~**`focus-bonus` mis-award**~~ — TD-5. **Fixed 7 August 2026**; bound by `taskId`.
3. ~~**Ceremony acknowledgement race**~~ — TD-7. **Fixed 7 August 2026**; acknowledges the ceremony it was shown.
4. **Equipped cosmetics do nothing** — persisted, never read.
5. ~~**Missions calendar defaults to day 17**~~ — **Fixed 7 August 2026.** The whole widget was a mockup (fixed "May 2025", hardcoded date grid, a selection that filtered nothing). It now builds a real Monday-first grid for the current month, defaults to today, has working month arrows, and the selected day drives a panel of missions actually due then — which also replaced the hardcoded "Today's Schedule" sample list.
6. **Academy loses all state on refresh** — no persistence.
7. ~~**Calendar shows identical events every month**~~ — **Fixed 7 August 2026.** The sample list is gone. The month view is now derived by `deriveCalendar()` as a union of the ledger, day plans and mission due dates, exactly as §5.6 required — no calendar store was created. *Verified:* with sources in August, September renders completely empty, which the old fixed list could never do.
8. ~~**Fitness "today" hardcoded to Thursday**~~ — **Fixed 7 August 2026.** Derived from the real weekday via `useNow`, so it is null on the server and cannot break hydration. Past days read done, future upcoming; today wins over a rest day so the week position is never lost.
9. **App unusable below 1024 px** — sidebar is `hidden lg:flex`.
10. ~~**User name hardcoded** in `src/data/mission.ts`~~ — **Fixed 7 August 2026.** Editable in Settings, stored at `mission-control-profile-v1`, included in export. Defaults to "friend" rather than inventing a name. The legacy `warrior` mockup object is deleted.
11. **Journey completion ceremony never runtime-tested** — code path exists and generators are unit-tested, but it has not been exercised in the running app. Since ADR-006 this needs 218,000 XP rather than 772,300, so a seeded ledger can now reach it plausibly.

> Previously fixed — **do not re-report**: import double-XP, UUID collision,
> Chronicle boundary double-count, Disciplines daily reset, wall-clock timer
> throttling, count-up frozen in hidden tabs, Hall of Mastery split-chunk crash,
> silent quota failure.

---

## 14. PROJECT HEALTH

| Category | Score | Deductions |
|---|---|---|
| Architecture | 92 | Excellent event-sourced core, now with a single writer everywhere; −8 no server tier |
| Performance | 70 | Hall's O(n²) hot path replaced by one memoised timeline; −30 `deriveStats` itself still recomputes on every change |
| Reliability | 70 | Prior correctness failures fixed and tested, ceremony race closed; −25 storage ceiling remains; −5 Journey path still untested at runtime |
| Maintainability | 82 | Documented, tested, and now type- and lint-clean with a single `npm run check` gate; −18 three 600–1,100-line unrefactored pages, plus four dead Mission components |
| Scalability | 25 | −45 single-browser silo, hard storage limit; −30 no sync or accounts |
| UI Consistency | 82 | Strong, coherent design language; two Missions mockups replaced with real data; −8 three pages still sample data; −10 no mobile layout |
| Data Integrity | 95 | Merge, dedupe, replay and undo all verified; duplicate state eliminated; −5 no schema validation on import |
| Progression | 92 | Maths provably correct, 92 tests passing, curve frozen and asserted; −8 Journey completion never runtime-tested |
| Testing | 62 | 112 assertions across 2 suites, now covering derived completion and event binding; −38 zero component/integration tests, no CI |
| Documentation | 92 | Consolidated under `docs/`, ADR trail started, stale audit archived; −8 only ADR-006 of the seven planned ADRs is written |
| **Overall** | **80** | Correctness and hygiene debt cleared; the storage ceiling and four sample-data pages remain |

---

## 15. REPOSITORY STRUCTURE

**Current documentation** (migrated into `docs/` on 7 August 2026 — the project
root now holds only `README.md` and `AGENTS.md`):

```
docs/
  00_PROJECT_CONTEXT.md     ← this file; read first, always          EXISTS
  03_PROGRESSION_ENGINE.md  ← the progression spec (5 parts)         EXISTS
  07_SPEC.md                ← page-by-page feature specification     EXISTS
  09_AUTOMATIC_PROGRESS.md  ← research + proposal: video progress
                              and assignments-from-email. AWAITING
                              A DECISION; nothing built yet.         EXISTS
  10_FOCUS_ENFORCEMENT.md   ← research + proposal: the focus HUD and
                              intervention-at-the-transition. Needs
                              the desktop build. AWAITING DECISIONS;
                              nothing built yet.                     EXISTS
  decisions/
    ADR-006-journey-xp-curve.md                                      EXISTS
    ADR-007-storage-ceiling-via-desktop.md                           EXISTS
  archive/
    AUDIT.md                ← stale, superseded; kept as a record    EXISTS
```

Both `03_PROGRESSION_ENGINE.md` and `07_SPEC.md` are current. `archive/AUDIT.md`
is stale by design — it carries an ARCHIVED banner and must not be used as a
reference.

**Still to be written** (structure reserved, no content yet):

```
docs/
  01_ARCHITECTURE.md        ← subsystems, data flow, module boundaries
  02_ACTIVITY_LEDGER.md     ← event model, merge, replay, guarantees
  04_DESIGN_SYSTEM.md       ← colour, type, motion, iconography, two surfaces
  05_ROADMAP.md             ← move §6 here, keep in sync
  06_CHANGELOG.md           ← dated engineering decisions
  08_TESTING.md             ← how to run suites, what they cover
  decisions/
    ADR-001-event-sourcing.md
    ADR-002-day-boundary-0400.md
    ADR-003-fixed-task-pot.md
    ADR-004-form-vs-rank.md
    ADR-005-mvd-and-grace.md
```

ADR-001 to 005 would be retrospective — they record decisions already frozen in
§9 and already implemented. Write them when touching the relevant subsystem, not
as a documentation sprint.

**Source layout (current, unchanged):**

```
src/
  platform/   the platform contract and its web implementation
              types.ts · index.ts · web/{storage,notifications,
              geolocation,presence,files}.ts
  services/   store.ts — key registry, JSON read/write, usage
  data/       activity · progression · rewards · chronicle · achievements
              plan · daily · disciplines · icons · calendar · mission(legacy)
  hooks/      use-activity · use-progression · use-day-plan · use-series
              use-favourites · use-weather · use-now · use-count-up
              use-distraction-shield · use-nightly-reminder
  lib/        backup · storage · youtube · utils
  components/mission/   ~30 presentational + Ceremony, Collections, StorageAlert
  routes/     12 file-based routes
scripts/
  progression-tests.ts   39 assertions
  qa-adversarial.ts      52 assertions
```

---

## 16. ENGINEERING HISTORY

Milestones in order, with the reasoning that produced them.

1. **Baseline.** Lovable-generated TanStack Start app. Beautiful UI; essentially all figures hardcoded.
2. **Four pages built** — Focus, Calendar, Projects, Fitness — replacing "Coming Soon" placeholders.
3. **Discovered SSR-hidden crash.** Hall of Mastery rendered correctly server-side but crashed on hydration: TanStack's route-splitter drops module constants declared *after* the component. **Rule: in route files, declare module data above the components that use it.**
4. **Home page made real.** Live weather, daily rotation, time-aware timeline, subtask-derived progress, nightly planner. Established the "derive, don't store" pattern.
5. **Activity Ledger introduced.** The pivotal decision. Replaced the hardcoded `warrior` object with an append-only event log; every statistic became a fold.
6. **Wall-clock timer.** A tick-counting timer lost ~5 minutes of a session to background throttling. Replaced with absolute-timestamp measurement.
7. **Count-up animation fixed.** `requestAnimationFrame` is paused in hidden tabs, freezing every figure at zero. Now skips animation when hidden or reduced-motion.
8. **External design review** produced five economy corrections: fixed task pot (removing the split-finely exploit), focus decay, Form vs. Rank separation, MVD + grace tokens, and schema hardening (`id`, `area`, `rateVersion`, `tz`, 04:00 boundary).
9. **Export/import built** with merge-by-id, and Settings became a real page.
10. **Disciplines rearchitected.** Completion moved from a stored boolean to dated ledger events, fixing the daily-reset bug at its root.
11. **Progression Engine built** to the formal specification: milestone curve, 10 Master Ranks, Journeys, promotions, Reward Engine, Chronicle and Menkyo generators. 39 tests.
12. **Celebration layer built.** Ceremonies, collections UI, acknowledgement and unlock persistence.
13. **Strict architectural audit** identified four critical issues, seven major, eight minor.
14. **Adversarial QA** found five reproducible failures: double XP on import, lost XP on id collision, Chronicle boundary double-count, and two duplicate-state violations.
15. **All five failures fixed and verified.** Two-pass merge, UUID ids, exclusive Journey assignment, load-time integrity repair. Suite went 44/49 → 52/52.
16. **Production audit** found the storage ceiling — silent total data loss at ~13 months. Write failures made loud, with a blocking alert and one-click export; verified by exhausting the quota for real.
17. **Work halted by the product owner** pending resolution of the Journey XP curve. Correct call: every downstream system depends on it.
18. **Curve frozen — ADR-006, 7 August 2026.** Option A: the Journey retargeted from 772,300 to **218,000 XP** on a linear 1,000 → 3,400 ramp. The spec had contradicted *itself* — its pacing bands and its stated duration were incompatible before any code was written — so the fix replaced the single component that could not coexist with both, and left the reviewed economy and the ranks untouched. Applied while the only ledger was test data, so no immutable Chronicle recorded a boundary that would later move. Documentation consolidated under `docs/` in the same pass and the stale audit archived.
19. **Correctness debt cleared — 7 August 2026.** TD-1, TD-2, TD-5, TD-7 and TD-8 fixed together, because they were one theme rather than five bugs: every one was a second writer for something the ledger already knew. Completion state and episode days deleted from their stores and derived; the focus bonus rebound from label substring to `taskId`; ceremony acknowledgement made to consume the ceremony it was shown; the unlock effect made to terminate by design. A latent batching race surfaced during verification and was closed with a new `transact` primitive — related toggles now decide against one consistent ledger snapshot, so ticking a task's last steps in quick succession can no longer silently skip the completion bonus. 20 new assertions.
20. **Remaining leftovers cleared — 7 August 2026.** TD-4's hot path (one memoised `buildStatsTimeline` replacing eighteen nested replays), TD-6 (progression removed from `MasteryStats`), TD-9 (35 type errors and 286 formatting errors to zero, `npm run check` added as a gate), the Ceremony timeout leak, and known bugs 5, 8 and 10. Two mockups died with them: the Missions mini-calendar became a real month grid whose selection actually filters, and the hardcoded "Today's Schedule" list became real missions due on the selected day. Left deliberately: TD-3 (needs ADR-007 first), Academy persistence, mobile layout, and equipped cosmetics.
21. **Calendar derived — 7 August 2026.** The last of the "identical every month" mockups. `deriveCalendar()` folds the ledger, day plans and mission due dates into one month view, enforcing *past is what happened, future is what is committed* — so a plan for a past day can never pose as an achievement. No calendar store was created, per §5.6's standing instruction. 11 new assertions, including the one that would have caught the original bug: a month with no sources must render empty.
22. **Platform seam introduced — 10 August 2026.** Ahead of an eventual Tauri desktop build, browser APIs were pulled behind `src/platform/` and all persistence behind `src/services/store.ts`. Thirteen scattered `localStorage` call sites became one adapter; notifications, geolocation, presence and file-saving followed. The contract is async because every desktop storage API is. No Tauri code was added and no UI changed. See §3.1b.
23. **Journal wired to the ledger — 11 August 2026.** Spirit form had been permanently 0% because nothing ever wrote a spirit event. Writing now logs `journal:<date>` at the already-frozen 30 XP rate, so no economy changed. The condition is *writing*, not opening the page or tapping a mood (§2.5); emptying the entry removes the event (§2.6). The journal model moved to `src/data/journal.ts` so the predicate is pure and testable — 11 new assertions. Found and fixed alongside: `unlog` returned a new array even when nothing matched, so a caller re-asserting "this should be absent" on every render — which the journal does, per keystroke — rewrote the whole ledger to disk each time.
24. **Fitness wired to the ledger — 11 August 2026.** Body form had the same dead-segment problem Spirit did: nothing had ever written a `workout` event. Completing every exercise now logs one for the day at the already-frozen 80 XP, so again no economy changed. The page also stopped forgetting — exercises and today's ticks persist — and four fabricated stat tiles (4 sessions, a 23-day streak, 18.4k kg moved, 82% recovery) plus a fixed six-week chart were replaced by figures folded out of the ledger. Body metrics now read "—" and say why. 16 new assertions.

---

## 17. CURRENT PRIORITY

### Finish and polish the core. Build on the right foundation.

Both prior blockers are closed. The XP curve is frozen (ADR-006), and the storage
ceiling is answered by ADR-007 — **the IndexedDB migration is withdrawn, not
postponed**, because the Windows desktop build solves it properly with a real
file. Do not build it.

So the priority is no longer a single architectural decision. It is the ordinary
work: finish the core functionality and polish it, on the platform-independent
architecture described in §3.1b.

**The standing rule that replaces the old blocker:** do not knowingly build a
browser-only solution for something that requires native Windows capability. If a
feature needs the tray, autostart, background scheduling, global shortcuts or
real blocking, build it against the platform contract and let it report
`unsupported` on the web — rather than shipping a browser imitation that must be
torn out later. Everything else stays platform-independent and works in both.

**Highest-value remaining work**, in rough order:

1. Wire **Missions** to the ledger (§6 item 4) — *but see the double-count warning in §6 before doing it*. Journal is already done (11 August 2026).
2. TD-10 — series credit *estimated* minutes as measured time, a live §2.10 violation.
3. Academy persistence, and the four pages still on sample data.
4. The unification of the two task systems.

Two research documents are open and awaiting decisions before their work starts:
`09_AUTOMATIC_PROGRESS.md` (video progress, assignments from email) and
`10_FOCUS_ENFORCEMENT.md` (the focus HUD, intervention at the transition).
Neither should be built without answering the questions at the end of each.
`10_FOCUS_ENFORCEMENT.md` §7 step 1 is also the first feature that **cannot**
exist in the browser, so it is the natural trigger for starting the Tauri build.

**Completed 7 August 2026 — do not redo:**
1. ~~Update `CURVE_MILESTONES` in `src/data/progression.ts`.~~
2. ~~Update the milestone table in the progression spec.~~
3. ~~Write `docs/decisions/ADR-006-journey-xp-curve.md`.~~
4. ~~Re-run both suites; assert the new `JOURNEY_XP`.~~ 40 + 52 passing; `JOURNEY_XP === 218_000` asserted.
5. ~~Resume the roadmap at §6 item 2.~~

---

## 18. INSTRUCTIONS FOR A NEW ASSISTANT

### Read first, in this order

1. **This document, in full.**
2. `docs/03_PROGRESSION_ENGINE.md` — the progression specification.
3. `docs/decisions/ADR-006-journey-xp-curve.md` — why the XP curve is what it is.
4. `docs/07_SPEC.md` — page-by-page feature detail.
5. `src/data/activity.ts` and `src/data/progression.ts` — the two files that matter most.
6. Ignore `docs/archive/AUDIT.md` — it is stale and archived.

### Verify before trusting

Run both suites; they should be green before you change anything. Both commands
and both expected outputs were verified on 7 August 2026:

```bash
npx tsx scripts/progression-tests.ts   # expect: 40 passed, 0 failed
npx tsx scripts/qa-adversarial.ts      # expect: 110 passed, 0 failed
```

`progression-tests.ts` also prints the live `JOURNEY_XP`. It should read
**218,000**, and asserts that value directly. If that assertion fails, someone
changed the curve — which needs an ADR superseding 006, not a new expected value
in the test.

Typecheck and lint:

```bash
npm run check    # typecheck + lint + both suites, as one gate
```

**Baselines are now zero.** `tsc --noEmit` reports **0 errors** and
`eslint src scripts` reports **0 errors**. The old baselines of 35 type errors
and 286 formatting errors were cleared on 7 August 2026 — if you see any, you
introduced them. Ten `react-refresh` warnings remain and are advisory.

Dev server: port **8080**, started via the preview tooling, never via a raw shell
command.

### Frozen — do not change casually

Everything in §9. In particular: never store a derived value, never mutate a
logged event's XP or day, never let a reward influence progression, and never
allow duplicate `ref`s to coexist.

### The one task

**The storage ceiling — see §17.** Progression is unblocked but is *not* the
current priority; do not start progression features because they are now
possible. The owner has repeatedly and correctly pulled work back to one thing at
a time.

The XP curve itself is closed. It is frozen at 218,000 by ADR-006 and asserted in
the test suite. Do not reopen it, re-derive it, or "improve" it — reopening a
frozen curve after Chronicles exist is the exact failure the freeze prevents.

### How to behave

- **Verify, do not assume.** Every claim in this document was tested. Match that standard: run the code, read the output, and report what actually happened rather than what should have happened.
- **State limits honestly.** If the platform cannot do something, say so and offer the achievable version. Do not fake capabilities.
- **Report failures plainly.** If a test fails or a step is skipped, say so with the output.
- **Do not silently widen scope.** The owner has repeatedly and correctly pulled work back to one thing at a time.
- **Prefer deriving over storing.** When adding any feature, the first question is "can this be derived from the ledger?" The answer is usually yes, and it is usually right.
- **Comment the *why*.** The codebase documents reasoning, not mechanics — match that voice.

---

*End of document. If anything material changed and is not reflected here, update
this file before ending your session.*
