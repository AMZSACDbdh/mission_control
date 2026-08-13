# Mission Control — What Every Page Actually Does

> **ARCHIVED — 7 August 2026. Do not use as a reference.**
>
> Accurate when written (4 August 2026) and preserved for that reason: it is the
> record of what the app was at that moment. It has since been superseded by
> `docs/07_SPEC.md` and `docs/00_PROJECT_CONTEXT.md`, and it predates the XP
> curve freeze in `docs/decisions/ADR-006-journey-xp-curve.md`, so any
> progression figure below is stale.

An honest, code-level audit of the app as it stands. For each page: what genuinely
works, what is still sample data, what survives a refresh, and what counts toward XP.

Audited against the source on **4 August 2026**. Nothing below is aspirational —
every claim was read out of the code or verified in the running app.

---

## Legend

| Mark | Meaning |
| --- | --- |
| **Real** | Driven by your data and real logic. Behaves correctly. |
| **Works, not saved** | Interactive, but changes are lost on refresh. |
| **Sample data** | Looks alive, but the numbers are typed into the source. |
| **Placeholder** | Not built yet. |

---

## The one thing that matters most: the activity ledger

`src/data/activity.ts` + `src/hooks/use-activity.tsx`

Every meaningful action appends an event to an append-only log
(`mission-control-activity-v1`). **No statistic is ever stored** — XP, level, rank,
streaks, hours, records, seals and mastery are all *derived* by folding that log.
This is why a number on screen cannot disagree with what you actually did.

Each event carries a stable `ref`. Ticking a step appends it; unticking removes that
exact ref, so undoing an action reverses its XP precisely — no double counting, no drift.

**XP rates** (`XP` in `activity.ts`) — the whole economy in one place:

| Action | XP |
| --- | --- |
| Complete a subtask / step | 10 |
| Complete a task (Critical) | +120 bonus |
| Complete a task (High) | +80 bonus |
| Complete a task (Standard) | +40 bonus |
| Complete the daily objective | +100 |
| Focused work | 1 XP per real minute |
| Workout logged | 80 *(not wired yet)* |
| Discipline completed | 15 *(not wired yet)* |
| Journal entry | 30 *(not wired yet)* |

**Levels** — level *L* requires `250 × L + 750` XP to advance. Level 1 → 2 costs 1,000 XP.

**Ranks** — held by level, seven tiers:
Shoshin (1) → Deshi (5) → Senpai (10) → Kenshi (15) → Bushi (22) → Bushidō (30) → Musō (40).

**Streak** — consecutive days with at least one logged event. It survives today being
empty (so it doesn't "break" at midnight), and only breaks once a full day is missed.

**Hours** — only *measured* time counts (focus sessions). Task time estimates are
deliberately excluded, so "total hours" never inflates with guesses.

---

## Home — `/` · **Real**

The most complete page. Almost everything is derived or persisted.

| Element | Status | How it works |
| --- | --- | --- |
| Greeting | **Real** | Five time bands from your device clock: Rest Well (<5am), Morning (<12), Afternoon (<17), Evening (<21), Good Night. Re-checks every minute. |
| Japanese proverb | **Real** | Rotates daily from a pool of 14, with romaji + translation. Deterministic by date — stable all day, different tomorrow. |
| Date | **Real** | Your device clock, your locale. |
| Weather | **Real** | Browser geolocation → Open-Meteo (free, no API key). WMO code mapped to label + icon. Falls back to New Delhi and labels itself "approximate" if you decline. City via reverse geocode. |
| Today's Intention | **Real** | Editable, saved **per calendar day**. Each day keeps its own. |
| Main Objective | **Real** | Progress = steps checked ÷ total steps. The 道 enso ring *is* the progress gauge. Completing all steps banks +100 XP. |
| Three Essential Tasks | **Real** | Progress = steps ÷ total. Priority pills explain themselves ("what do these mean?"). Drag to reorder. Finishing every step banks the priority-weighted bonus. |
| Focus Timeline | **Real** | Status derived from the actual clock against each block's start/end. Live "Now" badge, in-block fill bar, "Next 06:00" header. Ticks every 30s. |
| Plan Tomorrow | **Real** | Auto-appears after 21:00 until tomorrow is planned; also on demand. Sets 3 tasks (title, priority, icon, estimate, steps), objective and intention — saved under **tomorrow's** date, leaving today untouched. Auto-sorts Critical → High → Standard. Optional desktop notification. |
| Level / XP / Streak cards | **Real** | Derived from the ledger. Captions adapt ("Log anything today to begin a streak", "Your best is N days"). |
| Samurai philosophy | **Real** | Rotates daily from 15 quotes (Musashi, Hagakure, Yagyū, Zen). |

**Gap:** the timeline blocks themselves are a fixed default schedule — you can't yet
edit them from the planner.

---

## Focus — `/focus` · **Real**

| Element | Status | How it works |
| --- | --- | --- |
| Timer | **Real** | Measured against the **wall clock**, not by counting ticks. Pauses fold into a bank. Survives tab-switching and browser throttling. |
| Presets | **Real** | Deep Work 50 / Sprint 25 / Short Break 10 / Long Rest 20. Breaks are flagged `rest` and **earn nothing** — rest is not work. |
| Session banking | **Real** | On completion, logs real minutes at 1 XP/min, labelled with the task you selected. |
| Finish early | **Real** | Banks only the minutes genuinely worked. Disabled under 1 minute. Reset discards instead. |
| Focusing On | **Real** | Lists *today's actual planned tasks* from your day plan. |
| The four stat tiles | **Real** | Sessions today, focus time, focus streak, longest session — all folded from history. Shows "—" and "start one today" at zero rather than fake numbers. |
| Today's Sessions log | **Real** | Read straight from the ledger. |
| Distraction Shield | **Cosmetic** | A toggle that changes its own appearance. Blocks nothing. |

---

## Hall of Mastery — `/hall-of-mastery` · **Real**

Every figure folds out of the ledger. Nothing is stored.

| Element | How it works |
| --- | --- |
| Lifetime XP / Longest Streak / Total Hours | Summed from the log. |
| Rank medallion | Your real rank kanji, name, meaning, and % progress toward the next tier. |
| Current level + XP into level | Derived. |
| Journey timeline | Six milestones. Reached ones are **dated by replaying the ledger** to find the first day the condition held; unreached show their requirement. |
| Mastery Progress | Five areas (Discipline, Mind, Body, Knowledge, Spirit) computed from XP by activity kind, against a 5,000 XP target each. Overall = their average. |
| Unlocked Seals | 12 seals, each with a real predicate (first day logged, 7-day streak, 1,000 XP, 10 hours focus, level 5/10/20, 30- and 100-day streaks…). |
| Achievements | 10 badges on the same real conditions. |
| Major Milestones | Real dates or "Not yet". |
| Personal Records | Longest streak, best XP day, best focus day, best study day, workouts logged. |

**Note:** Body / Knowledge / Spirit will read near zero until Fitness, Academy and
Journal log to the ledger (below).

---

## Missions — `/missions` · **Works, saved — but separate from XP**

A genuinely functional Kanban app. Saves to `mission-control-missions-v3`.

**Real:** create missions (title, category, priority, column, duration); drag-and-drop
between Inbox / Today / Upcoming / Completed; toggle and add subtasks; delete; live
search across title/category/subcategory; filter by category and priority; three views
(Board / List / Calendar); a detail inspector; live ticking clock.

**Gaps:**
- **Earns no XP** — completing a mission doesn't touch the ledger, so it never affects level or streak.
- The mission calendar defaults to **day 17** (`selectedDateFilter = 17`), a leftover from the mockup date.
- Its data lives entirely apart from Home's "essential tasks" — two separate task systems.

---

## Daily Disciplines — `/disciplines` · **Works, saved — with a real flaw**

Eight habit rings (Hydration, Workout, Reading, Meditation, Coding, Study, Journal,
Walking). Saves to `mission-control-daily-disciplines-v2`.

**Real:** tapping a card toggles completion and fills its ring; the "N of 8 completed"
count and overall percentage are computed; Focus Mode and the notification popover work;
live clock.

**Gaps:**
- **No daily reset.** Completions are stored as one flat list with no date key, so
  yesterday's ticks are still ticked tomorrow. This is the most significant logic bug
  left in the app.
- Weekly consistency **78%** and monthly **82%** are hardcoded, as are the trend
  sparklines, the "7 disciplines active" streak and the "23 personal best".
- **Earns no XP.**

---

## Journal — `/journal` · **Works, saved**

**Real:** a genuine per-date journal. Every field (reflection, lessons, gratitude ×3,
tomorrow's intention, notes, ideas ×3, weekly/monthly reflection) is saved under its own
date key in `mission-control-journal-db`. Date navigation (prev / next / today) loads
that day's entry. The mood tracker cycles through four states and stores mood per day;
the week strip reads real moods back out of the database.

**Gaps:** earns no XP; the journal doesn't feed the Spirit mastery area; no search or
export across entries.

---

## Academy — `/academy` · **Works, NOT saved**

The most detailed page visually, and the largest gap between look and logic.

**Interactive:** rotate the quote, drag to reorder courses, "resume" a course (advances
progress), start an assignment, revise an exam, select a book, resume reading (advances
chapter), search.

**The problem: nothing persists.** There is no localStorage call in the entire file —
every change is lost on refresh.

**Sample data:** study hours this week (18.6h), total study (247.8h), focus sessions (28),
learning streak (47), knowledge level, the weekly bar chart, subject completion
percentages, all four courses, five books, three assignments, three exams, and the
learning-path roadmaps.

**Earns no XP.**

---

## Projects — `/projects` · **Works, NOT saved**

**Real:** filter by stage (All / In Forge / Drafting / Shipped); selecting a project drives
the detail panel; the enso ring and milestone checklist reflect the selected project;
the four stat tiles are computed from the project list (active count, shipped count,
milestones done/total, average progress).

**Sample data:** all five projects, their progress percentages, milestones and due dates
are typed into the source. **No add / edit / delete, no persistence, no XP.**

---

## Fitness — `/fitness` · **Works, NOT saved**

**Real:** ticking an exercise updates the "N / 5 done" count and the session progress bar.

**Sample data:** the five exercises, the weekly training split (with Thursday hardcoded as
"today"), all four stat tiles (4 sessions, 23-day streak, 18.4k volume, 82% recovery),
body metrics, and the six-week volume chart. **No persistence, no XP.**

---

## Calendar — `/calendar` · **Works, NOT saved**

**Real:** a correct Monday-first month grid built from actual date maths; prev / next /
Today navigation; today is highlighted only when viewing the current month; clicking a
day shows its schedule; a "+N more" overflow; category legend.

**Sample data:** the 13 events are a fixed list re-used for whatever month you view, so
August and December show identical entries. **No add / edit, no persistence, no link to
Missions or the day plan.**

---

## Insights — `/insights` · **Placeholder**

"Coming Soon" panel only. Ironically the page best suited to the ledger — it already has
everything needed for trends, heatmaps and per-area breakdowns.

## Settings — `/settings` · **Placeholder**

"Coming Soon" panel only. Your name is still a constant in `src/data/mission.ts`.

---

## Sidebar (every page) · **Real**

Rank kanji, rank name, meaning, discipline level, XP bar and XP figures all derive from
the ledger and update live from any page. Navigation shows the active page with a gold
edge indicator.

---

## Where the data lives

| Key | Holds | Used by |
| --- | --- | --- |
| `mission-control-activity-v1` | The activity ledger | Sidebar, Home, Focus, Hall of Mastery |
| `mission-control-day-plans-v1` | Per-day plans (tasks, objective, intention, timeline) | Home, Focus |
| `mission-control-missions-v3` | Kanban missions | Missions |
| `mission-control-daily-disciplines-v2` | Habit completions | Daily Disciplines |
| `mission-control-journal-db` | Journal entries by date | Journal |

All storage is local to this browser. Nothing syncs across devices, and clearing site
data erases everything. There is no export yet.

---

## The honest gap list, in priority order

1. **Disciplines never reset daily.** Yesterday's completions persist into today. Real bug.
2. **Academy doesn't save anything.** The richest page loses all state on refresh.
3. **Four pages earn no XP** — Missions, Disciplines, Journal, Fitness. Each is a one-line
   `log()` call away, but until then Body / Knowledge / Spirit mastery sit near zero and
   your streak ignores four of the things you actually do.
4. **Projects, Fitness and Calendar can't be edited.** You can tick things, but you cannot
   add your own projects, exercises or events — so they still show my sample content.
5. **Two parallel task systems.** Home's "essential tasks" and Missions don't know about
   each other.
6. **Hardcoded remnants:** Academy's study stats, Disciplines' consistency percentages
   and trends, Fitness's entire stat row, Missions' day-17 calendar default, and your
   name in `data/mission.ts`.
7. **Insights and Settings unbuilt.**
8. **No export/backup.** Everything is one "clear site data" away from gone.

---

## Things that are correct in ways worth keeping

- Unticking always reverses exactly the XP it granted — verified by toggling repeatedly
  and confirming no drift or duplicate events.
- The focus timer uses wall-clock time. An earlier tick-counting version lost ~5 minutes
  of a session to background-tab throttling.
- Counters skip their animation in hidden tabs and for reduced-motion users, instead of
  freezing at zero.
- Rest blocks earn nothing, and task *estimates* never inflate measured hours.
- Daily rotation is deterministic by date — stable within a day, different the next.
