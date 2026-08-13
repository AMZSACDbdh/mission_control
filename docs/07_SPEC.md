# Mission Control — Complete Feature Specification

A page-by-page description of every feature: what it is, what it does, and the
logic behind it. Written so it can be handed to any developer or AI as a build
prompt, and read as the definitive description of the product.

Status markers throughout:
**[BUILT]** working and verified · **[PARTIAL]** works but incomplete · **[TODO]** not built

---

# PART 1 — WHAT THIS IS

Mission Control is a personal operating system for disciplined days, themed on
Japanese craftsmanship and Bushidō. Desktop-first, dark by default, running
entirely in the browser with no backend and no account.

**The governing idea:** you plan a small number of things the night before, do
them, and the system records what actually happened. Everything it tells you
about yourself is computed from that record — never asserted.

## Design language

- **Palette** — warm charcoal backgrounds (`oklch(0.18 0.01 60)` family), burnished gold accents (`oklch(0.78 0.11 82)`), cinnabar red seals. No neon, no glassmorphism, no flashy gradients.
- **Type** — Cormorant Garamond for display and numerals, Inter for UI text. Large sizes, wide letterspacing on small caps labels (`0.28em`).
- **Materials** — paper texture on panels, ink-brush SVG artwork (mountains, bamboo, pine, waves, moon), enso rings, carved hanko seals.
- **Motion** — slow and subtle. `cubic-bezier(0.22, 1, 0.36, 1)`, 500–1800ms. Cards lift 2px on hover. Progress bars and rings animate in. Nothing bounces.
- **Two surfaces** — most pages are dark charcoal; Daily Disciplines and Journal are light washi paper (`#F2ECE1`), deliberately, because they are reflective spaces.
- **Chrome** — scrollbars are charcoal with gold hover so they never break the dark theme.

---

# PART 2 — THE CORE ENGINE

Everything on every page is built on this. Understand it and the rest follows.

## 2.1 The activity ledger **[BUILT]**

An append-only log of everything you do. It is the single source of truth.

```ts
type ActivityEvent = {
  id: string          // merge identity — two devices union by this, cannot conflict
  ref: string         // stable dedupe key, e.g. `subtask:2026-08-05:t1:t1-s0`
  kind: ActivityKind  // subtask | task | objective | focus | focus-bonus
                      // | workout | discipline | journal | study
  area: Area          // discipline | mind | body | knowledge | spirit
  xp: number          // FROZEN at log time — never recomputed
  rateVersion: number // which rate table awarded it
  at: string          // ISO UTC instant
  day: string         // local day key at the 04:00 boundary, FROZEN at log time
  tz: string          // IANA zone at log time
  minutes?: number    // measured time, where the activity represents real elapsed time
  label: string
}
```

**Three rules that must never be broken:**

1. **Derive everything, store nothing.** No statistic is ever written down. XP, level, rank, streaks, hours and records are folded from this log on read. A displayed number cannot disagree with history because there is no second copy.
2. **XP is frozen on the event.** Rebalancing the rates affects the future only. Two years of history never silently re-prices itself.
3. **The day key is frozen on the event.** Computed once, in the zone you were in. Travelling cannot retroactively reshuffle which day your past work belongs to.

**Reversal:** unticking removes the event with that exact `ref` — it does *not*
append a negative-XP compensator, which would pollute history and break per-day
analysis. Verified: 3 steps + completion = 150 XP; untick one step → 20 XP
(loses the step *and* the completion bonus); re-tick → exactly 150 again;
toggling repeatedly never drifts or duplicates.

## 2.2 The day boundary **[BUILT]**

Days roll over at **04:00 local**, not midnight. Work logged at 00:30 belongs to
the day you experienced it as. Day plans use the same boundary, so plans and
events always agree on what "today" means.

## 2.3 The XP economy **[BUILT]**

### Tasks — a fixed pot

A task is worth a fixed amount by priority, regardless of how finely you slice it.
**Half the pot is split across its steps, half is paid on completion.**

| Priority | Total | Across steps | On completion |
| --- | --- | --- | --- |
| Critical | 200 | 100 | 100 |
| High | 140 | 70 | 70 |
| Standard | 80 | 40 | 40 |
| Daily objective | 150 | 75 | 75 |

*Why:* a flat per-step rate makes splitting tasks finely the dominant strategy, and
within a month your XP tracks your typing habits rather than your life. Verified:
a Critical task pays ~200 whether written as 3 steps or 20 (199 / 196 / 196 / 200).
Steps are progress markers, not currency.

### Focus — a decaying curve

1 XP per measured minute, tiered against minutes already focused **that day**:

| Minutes that day | Rate |
| --- | --- |
| 0–120 | ×1.00 |
| 120–240 | ×0.75 |
| 240+ | ×0.50 |

An 8-hour day yields **330 XP, not 480**. *Why:* hour eight is not worth what hour
one was, and a flat rate makes sitting still the most profitable act in the app.
Verified: three completed Critical tasks (600) now beats an eight-hour sit (330).
Under a flat rate the sit won.

### Other rates

| Action | XP |
| --- | --- |
| Discipline completed | 15 |
| Journal entry | 30 |
| Series episode | 30 |
| Workout | 80 |
| Focus → task finished same day | +25% of that focus, as its own removable event |

**Rest earns nothing.** Break blocks are timed but never paid — the moment breaks
earn XP, the optimal strategy becomes taking breaks.

**Estimates never count as measured hours.** Only real elapsed time (focus
sessions) contributes to "total hours". Task duration estimates are stored but
deliberately excluded, which keeps the door open for estimate-calibration later.

## 2.4 Levels and ranks **[BUILT]**

Level *L* requires `250 × L + 750` XP to advance. Level 1 → 2 costs 1,000.
Lifetime XP is monotonic — it never falls.

| Rank | Kanji | Meaning | From level |
| --- | --- | --- | --- |
| Shoshin | 初心 | The Beginner's Mind | 1 |
| Deshi | 弟子 | The Student | 5 |
| Senpai | 先輩 | The Senior | 10 |
| Kenshi | 剣士 | The Swordsman | 15 |
| Bushi | 武士 | The Warrior | 22 |
| Bushidō | 武士道 | The Way of the Warrior | 30 |
| Musō | 無双 | Without Equal | 40 |

## 2.5 Streaks — Minimum Viable Day + grace **[BUILT]**

A day counts **only if it clears a real bar**. Any one of:

- 25+ minutes of measured focus, **or**
- the daily objective completed, **or**
- 100+ XP earned

*Why:* "any logged event" means one tap at 23:58 preserves a 90-day streak, and a
streak you can fake means nothing.

**Grace tokens:** earn 1 per 7 unbroken days, hold at most 2. A missed day spends
one and renders as *recovered* — visibly distinct from earned. *Why:* a system
that punishes one flu day with total reset is a system you eventually delete.

Verified with 17 days of history containing one missed day: the streak read **18,
not 4**, and the token count correctly showed 1 remaining (earned 2, spent 1).

## 2.6 Form vs. Rank **[BUILT]**

Two different questions, deliberately separated:

- **Rank / level / seals / records** — lifetime, monotonic. What you *have done*. Never falls.
- **Form** — rolling 30-day XP per area against a sustainable target. What you *are doing*. Falls when you stop.

| Area | 30-day target | Roughly means |
| --- | --- | --- |
| Discipline | 1,500 | habits + task completion, most days |
| Mind | 1,200 | ~40 min measured focus/day |
| Body | 1,000 | ~3 workouts/week |
| Knowledge | 1,200 | ~40 min study/day |
| Spirit | 600 | journalling most days |

*Why:* cumulative mastery pins at 100% within weeks and then reads the same a year
after you quit — a trophy, not a mirror. "Body 40%" means you are at 40% of your
own sustainable cadence, which is true, actionable, and fixable today.

## 2.7 Storage **[BUILT]**

| Key | Holds |
| --- | --- |
| `mission-control-activity-v1` | The activity ledger |
| `mission-control-day-plans-v1` | Per-day plans (tasks, objective, intention, timeline) |
| `mission-control-series-v1` | Series and courses |
| `mission-control-focus-session-v1` | A focus session in progress |
| `mission-control-favourite-quotes-v1` | Kept quotes |
| `mission-control-missions-v3` | Kanban missions |
| `mission-control-daily-disciplines-v2` | *(legacy — no longer read)* |
| `mission-control-journal-db` | Journal entries by date |
| `mission-control-youtube-key-v1` | YouTube Data API key |

Everything is local to one browser. No sync, no account, no server.

---

# PART 3 — PAGE BY PAGE

## 3.1 Sidebar (every page) **[BUILT]**

- Lotus crest, "MISSION CONTROL / MASTER YOUR PATH", rotates 45° on hover.
- 12 nav items, each with an icon; the active page gets a gold left-edge indicator that scales in.
- **Rank crest at the bottom:** your rank kanji stacked vertically inside a hand-drawn enso, rank name, its meaning, a gold hairline, then Discipline Level, XP bar and `xpIntoLevel / xpForNext`.
- All of it derives from the ledger and updates live from any page.
- Ink mountains wash behind the crest.

---

## 3.2 Home — `/` **[BUILT]**

The daily command centre. Everything here is real.

### Hero banner
- **Greeting** across five time bands from the device clock: Rest Well (<05:00), Good Morning (<12:00), Good Afternoon (<17:00), Good Evening (<21:00), Good Night. Re-checks every minute.
- **Three times of day** — the plate and its colour grade shift with the hour: dawn (warm gold wash), midday (cooler, flatter), dusk (sepia, the last warmth draining), night (deep blue, 42% brightness). Never bright enough to fight the text.
- **Japanese proverb** rotating daily — kanji, romaji, and translation.
- **Date** in your locale, and **live weather** (temperature + condition) from browser geolocation via Open-Meteo. **Your location is never displayed.**

### Today's Intention
One editable paragraph, saved **per calendar day**. Each day keeps its own.

### Today's Main Objective
- Title, subtitle, and a step checklist.
- **Progress = steps checked ÷ total.** The 道 enso ring *is* the gauge, with "THE WAY" beneath it.
- Completing every step banks the objective pot.

### Three Essential Tasks
- Numbered, with icon, title, description, priority pill, duration estimate, and a step checklist that expands.
- **Progress = steps ÷ total**, shown as "2/3 steps".
- Priority pills are self-explaining via a "what do these mean?" toggle:
  - **Critical** — the day fails without it. Do it first, protect it from everything else.
  - **High** — real consequences if it slips, but the day survives.
  - **Standard** — keeps momentum and compounds. Do it if the first two are safe.
- Drag to reorder. Completed tasks get a gold strike-through, never disappear.
- The constraint is the feature — it is three, not five.

### Focus Timeline
- Blocks with start/end times; status derived from the **actual clock**, not stored.
- Live "Now" badge on the active block, an in-block fill bar showing how far through it you are, and a "Next 06:00" header. Ticks every 30s.
- Dot markers on a hairline rail: gold when live, faded gold when done, slate-blue when queued.
- **[TODO]** blocks are not yet editable from the planner.

### Plan Tomorrow
- Appears automatically after **21:00** until tomorrow is planned; also available on demand.
- Set three tasks (title, why it matters, priority, icon, estimate, steps — one per line), plus tomorrow's objective and intention.
- Saved under **tomorrow's** date; today's board is untouched.
- **Auto-sorts Critical → High → Standard** so tomorrow opens with the right task at number one.
- Optional desktop notification at the planning hour. *Honest limit: a web page cannot wake a closed laptop; the in-app panel is the reliable path.*
- **[TODO]** explicit do/defer/drop triage of unfinished tasks, rather than silent carry-over.

### Rank & Progression
Three cards — Discipline Level (with rank and next rank), XP Progress (with XP
earned today), Current Streak (with grace tokens in hand and what today still
needs). Alongside: "Today: 1 of 3 tasks done · objective 25%".

### Samurai Philosophy
- **61 quotes in rotation** — Musashi, Hagakure, Yagyū, Sun Tzu, Laozi, Confucius, Zen and Japanese proverbs.
- **Nothing repeats until all 61 have been seen**, then it reshuffles into a different order. Verified: every cycle is exhaustive 61/61.
- **"Keep this"** saves a quote. A counter opens a **Kept Words** panel listing everything you kept, with the date and a remove control.
- *Honest limit:* a finite pool must eventually cycle. Worst case across a cycle boundary is a repeat 5 days apart. No quotes API is used deliberately — the free ones are CORS-blocked and unreliable.

---

## 3.3 Focus — `/focus` **[BUILT]**

### The timer
- **Measured against the wall clock**, never by counting ticks. Pauses fold into a bank. Survives tab-switching, browser throttling, and machine sleep. *(A tick-counting version lost ~5 minutes of a session to background throttling — measured.)*
- **Survives a full page reload** mid-session, because timing is anchored to absolute timestamps.
- Four presets: Deep Work 50, Focus Sprint 25, Short Break 10, Long Rest 20.
- **Proper Pomodoro cycle** — four work blocks earn a long rest; auto-advances work → short break → work, with dots showing "block 1 of 4" / "long rest next".
- **Finish early** banks only the minutes genuinely worked (disabled under 1 minute). **Reset** discards instead.
- Live readout of minutes worked, XP earned so far, and which rate tier you're on.

### Distraction Shield
*A web page cannot block other apps or websites — no browser permits it.* So the
shield does the one honest, useful thing available:

- Uses the Page Visibility API to notice **every time you leave the tab**.
- Counts departures, measures total time away, tracks your longest unbroken stretch.
- Computes **presence** = time present ÷ session, minus a switch penalty of 4% per departure (capped at 40%), because regaining depth is slower than losing it.
- **Presence scales the XP.** A 50-minute block you sat through is worth more than 50 minutes spent bouncing between tabs. The interruption count is written into the session label.
- Header reads "Shield on · unbroken" or "Shield on · 3 left".

### Focusing On
Lists **today's actual planned tasks** from your day plan; the selected one is
bound to the session and named in its ledger entry.

### Statistics
Sessions today, focus time banked (with current rate tier), focus streak, longest
session — all folded from history. Shows "—" and "start one today" at zero rather
than inventing numbers.

### Today's Sessions
Read straight from the ledger: label, XP, minutes, time of day.

### Series & Courses
- Work through a course, playlist or book **one piece a day**.
- **Import a YouTube playlist** — paste a public link, it fetches real episode titles and pages through playlists longer than 50 items. Requires a free YouTube Data API key (Settings).
- **Or add by hand** — a title and a number of parts.
- Per series: progress bar, "N of M done", per-series streak, **projected finish** at your current pace, a daily target you can change, and "Mark done" on the next unwatched episode.
- Ticking logs **30 XP of Knowledge study with measured minutes**, so a series feeds Knowledge form and your streak like any other work.
- *Honest limit stated in the UI:* YouTube has not exposed watch history through its API since 2016. **Nothing can detect what you actually watched** — the import gives you real episode names; the ticking is yours.

---

## 3.4 Daily Disciplines — `/disciplines` **[BUILT]**

Light washi surface. Eight habit rings: Hydration, Workout, Reading, Meditation,
Coding, Study, Journal, Walking.

**The architecture that matters:** a discipline's *definition* (name, target, unit,
icon, area) is durable, but its **completion is never stored on it**. Completion is
a **dated ledger entry**. Today starts empty because no entries exist for today
yet — there is no reset logic to forget or get wrong.

- Tapping a card toggles it and logs **15 XP** to its area (Hydration/Workout/Walking → Body, Reading/Coding/Study → Knowledge, Meditation/Journal → Spirit).
- **Weekly and monthly consistency** = achieved completions ÷ possible, over 7 and 28 days. Days before you started are excluded, so a new user sees an honest 0% rather than a demoralising 3%.
- **Both trend sparklines** are drawn from real daily completion counts (the monthly one as four weekly averages).
- **Current streak** = consecutive days with at least one discipline kept.
- **Personal best** = most disciplines ever completed in one day.
- **Each card shows its own streak** ("4-day streak") or "not yet today".
- Focus Mode and a notification popover that reports your real streak and consistency.

Verified by simulating a day passing: yesterday's completions stay in the ledger,
today resets to "0 of 8", and per-discipline streaks survive the boundary.

---

## 3.5 Hall of Mastery — `/hall-of-mastery` **[BUILT]**

The record. Every figure folds out of the ledger; nothing is stored.

- **Lifetime XP, longest streak, total measured hours, seals unlocked.**
- **Rank medallion** — rank kanji in an enso, name, meaning, % progress toward the next tier, current level and XP into it.
- **Journey timeline** — six milestones. Reached ones are **dated by replaying the ledger** to find the first day each condition held; unreached ones show their requirement.
- **Current Form** — the five areas as rolling 30-day form (see §2.6), with **decay hints** ("Body · 12d quiet") that fire before the ring visibly drops. Footer: *"Form is what you are doing now. Rank is what you have done."*
- **12 seals**, each with a real unlock predicate: first day logged, 7-day streak, 1,000 XP, 10 hours focus, level 5, 14-day streak, 5,000 XP, 30-day streak, 50 hours focus, level 10, level 20, 100-day streak.
- **10 achievement badges** on the same real conditions.
- **Major milestones** with real dates or "Not yet".
- **Personal records** — longest streak, best XP day, best focus day, best study day, workouts logged.

---

## 3.6 Settings — `/settings` **[BUILT]**

- **Ledger summary** — events recorded (and since when), lifetime XP with level and rank, measured time.
- **Export Everything** — downloads every store as readable JSON, filename dated.
- **Restore From File** — **merges the ledger by event id** rather than overwriting, so importing an old backup can never delete newer work. Verified: 0 → 17 events / 2,550 XP exactly, and re-importing the same file is idempotent.
- **YouTube Data API key** — password field, stored only in this browser, used only to read public playlists.
- **"How Progress Is Counted"** — the entire economy stated in plain language: task pots, focus curve, what counts as a day, grace tokens, form vs. rank. Shows the current rate version.

---

## 3.7 Missions — `/missions` **[PARTIAL]**

A genuinely functional Kanban board, saved to its own store.

**Works:** create missions (title, category, priority, column, duration); drag and
drop between Inbox / Today / Upcoming / Completed; toggle and add subtasks;
delete; live search across title, category and subcategory; filter by category and
priority; three views (Board / List / Calendar); a detail inspector; live clock.

**Gaps:**
- **[TODO]** Earns no XP — completing a mission never touches the ledger, so it doesn't affect level, form or streak.
- **[TODO]** The mission calendar defaults to **day 17**, a leftover from the mockup date.
- **[TODO]** Lives entirely apart from Home's essential tasks — two parallel task systems. The intended fix: Missions is the store; the day plan holds `taskId` references plus per-day order, never copies.

---

## 3.8 Journal — `/journal` **[PARTIAL]**

Light washi surface, laid out as an open book.

**Works:** a real per-date journal. Every field — today's reflection, lessons
learned, three gratitudes, tomorrow's intention, daily notes, three ideas, weekly
and monthly reflection — is saved under its own date key. Date navigation (prev /
next / today) loads that day's entry. The mood tracker cycles four states, stores
mood per day, and the week strip reads real moods back out.

**Gaps:**
- **[TODO]** Earns no XP, so Spirit form stays at zero.
- **[TODO]** No search or export across entries.

---

## 3.9 Academy — `/academy` **[PARTIAL]**

The most detailed page visually, and the largest gap between look and logic.

**Interactive:** rotate the quote, drag to reorder courses, resume a course
(advances progress), start an assignment, revise an exam, select a book, resume
reading (advances chapter), search.

**Gaps:**
- **[TODO] Nothing persists** — there is no storage call in the entire file. Every change is lost on refresh.
- **[TODO]** Study hours, total hours, focus sessions, learning streak, knowledge level, the weekly bar chart, subject completion, all courses, books, assignments, exams and learning-path roadmaps are sample data.
- **[TODO]** Earns no XP.

---

## 3.10 Fitness — `/fitness` **[PARTIAL]**

**Works:** ticking an exercise updates the "N / 5 done" count and the session
progress bar.

**Gaps:**
- **[TODO]** The five exercises, the weekly split (Thursday hardcoded as "today"), all four stat tiles, body metrics and the six-week volume chart are sample data.
- **[TODO]** No persistence, no XP, no way to enter your own workouts.

---

## 3.11 Projects — `/projects` **[PARTIAL]**

**Works:** filter by stage (All / In Forge / Drafting / Shipped); selecting a project
drives the detail panel with its enso progress ring and milestone checklist; the
four stat tiles are computed from the project list.

**Gaps:**
- **[TODO]** All five projects, their progress, milestones and due dates are sample data.
- **[TODO]** No add / edit / delete, no persistence, no XP.

---

## 3.12 Calendar — `/calendar` **[PARTIAL]**

**Works:** a correct Monday-first month grid from real date maths; prev / next /
Today navigation; today highlighted only when viewing the current month; click a
day to see its schedule; "+N more" overflow; category legend.

**Gaps:**
- **[TODO]** The 13 events are a fixed list re-used for every month, so August and December show identical entries.
- **[TODO]** The intended fix is **not** to build a calendar store, but to **derive** the calendar — union of day plans, mission due dates, focus sessions and discipline completions. Past = what happened, future = what's committed. A parallel store is what produces the 13-events-every-month bug.

---

## 3.13 Insights — `/insights` **[TODO]**

Placeholder. Ironically the page best served by the ledger, which already holds
everything needed. Planned, in priority order:

1. **Estimate calibration** — you store planned estimates and measured focus time separately and never mix them. Compare them, surface a personal multiplier, and have Plan Tomorrow warn: *"You've planned 6h into a day where you historically complete 3.2h."* The single most valuable feature available from data already held.
2. **Priority honesty** — completion rate by priority. If Critical runs at 45% and Standard at 90%, you are avoidance-tasking.
3. **Peak hours** — XP and completions by hour of day.
4. **Decay alerts** — "Body: 14 days since last log."
5. **Objective hit rate by weekday.**
6. **Plan-vs-actual drift** — how often the morning's three tasks are the three you did.
7. **Weekly value rating** — one question, "How valuable was this week?" 1–5, plotted against weekly XP. This is the app's error-correction term: XP measures whether you did a lot; only you can say whether it mattered.

---

# PART 4 — REMAINING WORK, IN ORDER

1. **Wire Journal and Missions to the ledger** — small edits; unlocks Spirit form and makes Missions count.
2. **Fitness → ledger + editable** — enter your own exercises and workouts.
3. **Academy persistence** — the richest page currently loses everything on refresh.
4. **Projects and Calendar editing** — Calendar should be *derived*, not stored.
5. **Unify the two task systems** — Missions as the store, day plan holding references.
6. **Editable focus timeline blocks** and do/defer/drop triage in Plan Tomorrow.
7. **Insights** — starting with estimate calibration.
8. **Your name** — still a constant in `data/mission.ts`; belongs in Settings.
9. **Month snapshotting** — ~50 events/day × 3 years ≈ 55k events folded per render. Cache closed months and replay only the current tail.

---

# PART 5 — PRINCIPLES TO PRESERVE

These were arrived at deliberately. Changing them changes what the app means.

1. **Derive everything, store nothing.** Every bug where a page showed a stale or fake number traced back to violating this.
2. **Unticking reverses exactly.** Remove the ref; never append a compensating event.
3. **Measure the wall clock, never count ticks.** Browsers throttle timers.
4. **Rest earns nothing. Estimates are not measured hours.**
5. **Slicing a task finely must never pay more.**
6. **A streak you can fake is worthless; a streak that punishes one flu day gets deleted.** Hence MVD plus grace.
7. **Lifetime never falls; form does.** One is a record, the other a mirror.
8. **State limits honestly in the UI.** Where the app cannot do something — block websites, read watch history, read OS screen time — it says so plainly rather than faking it.
9. **Three essential tasks.** The constraint is the feature.
10. **Export is not optional.** Years of ledger are one cleared cache from gone.
