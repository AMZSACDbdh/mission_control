# Automatic Progress — Research & Design Proposal

**Status:** Proposal. Awaiting a decision from the product owner.
**Date:** 10 August 2026
**Touches frozen rules:** §2.2, §2.5, §2.10, §2.11, §9. Nothing here may be built
without an explicit decision, and the XP changes in §6 would need their own ADR.

---

## 0. The question

Three things were asked for:

1. How should task progress work, done properly?
2. Can a task that *is* a YouTube video progress itself as it is watched?
3. Can assignments arrive automatically from Gmail deadline emails?

The short answers: **yes, yes with one large caveat, and yes but not the way it
sounds.** The caveat and the "not the way it sounds" are the important parts, so
they come first.

---

## 1. What is actually possible — the hard limits

### 1.1 YouTube watch history is not available. At all.

This is not a difficulty, it is a wall.

`contentDetails.relatedPlaylists.watchHistory` was deprecated on **11 August
2016** and has returned an empty placeholder ever since. `activities` is
deprecated. **There is no OAuth scope for watch history.** There is no
supported way, at any price, for any application, to ask Google "what did this
user watch on YouTube?"

This confirms the honest limit already recorded in §2.16 of the project context,
and it must stay recorded. Any feature described as *"Mission Control notices
what you watched on YouTube"* would be a lie, and by §1's own standard — *one
fabricated figure contaminates trust in every real one* — it would be the worst
class of defect this codebase can have.

### 1.2 But watch progress *is* available — if the video plays inside the app

The **IFrame Player API** is a fully supported, unrestricted, no-OAuth,
no-API-key surface. Embed the player, and it will tell you:

| Method / event | Gives you |
|---|---|
| `getCurrentTime()` | current position, in seconds |
| `getDuration()` | total length, in seconds (0 until metadata loads) |
| `onStateChange` | `PLAYING`, `PAUSED`, `ENDED`, `BUFFERING` |

Polled while playing, that is a genuine, second-by-second record of what was
watched. It is not a guess and not an estimate — it is measurement.

**The trade is explicit and unavoidable:** progress is automatic *only for video
watched inside Mission Control*. Watch the same video on youtube.com and the app
will never know. That is the honest version of the feature, and it should be
stated in the UI exactly that plainly, in the same voice as the existing "YouTube
has not exposed watch history since 2016" note.

### 1.3 Gmail is possible, but `gmail.readonly` is a *restricted* scope

For a **published** app, restricted scopes require a CASA security assessment by
a Google-approved lab, renewed **annually**, at a cost variously reported from
~$500 to $75,000 depending on tier and assessor. That is categorically out of
scope for a single-user local app.

For **personal use** it is still workable, because the rules are different:

- An OAuth client left in **Testing** status, with your own account as a test
  user, needs no verification and no assessment.
- You will see an *"unverified app"* warning once, and click through it.
- Testing mode expires **refresh tokens after 7 days** — but a browser-only app
  using the Google Identity Services token flow never receives a refresh token
  in the first place. It gets a **1-hour access token**, silently re-issued while
  you remain signed in to Google. So the 7-day rule is mostly moot; the practical
  cost is an occasional re-authorise click.

The real objection to this path is not cost, it is **blast radius**: it puts a
token with read access to your entire mailbox inside a `localStorage`-backed web
page. For a personal discipline tracker that is a poor trade, and §3 proposes a
better one.

---

## 2. The architectural problem, and the idea that solves it

Automatic progress looks like it violates the two rules this codebase is built
on. It does not, but only if one distinction is made explicitly.

> **A cursor is not a statistic.**

- *"Where am I in this video?"* is a **cursor**. It is ephemeral, resumable,
  safe to lose, and means nothing on its own.
- *"Did I finish this?"* is a **record**. It is truth, it is frozen, it earns XP,
  and it is undone by removing its `ref`.

§2.2 forbids storing **derived statistics**. It does not forbid storing player
state — and the project already does exactly this, sanctioned, in
`mission-control-focus-session-v1`, which holds an in-flight focus session so it
survives a reload. A watch cursor is the same category of thing.

So the rule to adopt:

| | Cursor store | Activity Ledger |
|---|---|---|
| Answers | "where was I?" | "what did I do?" |
| Lost on clear | annoying | catastrophic |
| Feeds XP | **never** | always |
| Feeds hours / streak / form | **never** | always |
| Undo | overwrite freely | remove by `ref` |

A cursor crossing a threshold **emits a ledger event exactly once**. From that
instant the ledger is the only truth, and the cursor is irrelevant to every
statistic on every page. Delete the entire cursor store and not one number
changes — the same test §9 applies to the progression store.

This is what keeps the feature honest, and it is the single most important
sentence in this document.

---

## 3. Assignments from email — three routes, ranked

An imported email is **intent, never achievement**. It creates a commitment with
a due date; it must never write to the ledger. Awarding XP for *receiving mail*
would violate §2.5 outright — XP is for completed work, and the existing
prohibition list already includes "planning tomorrow" and "editing tasks".

### Route A — Apps Script bridge *(recommended)*

A ~30-line Google Apps Script, bound to your own account, that:

1. Runs on a time trigger (say hourly).
2. Searches your mail with a query *you* control —
   `label:assignments newer_than:30d`, or a filter you already have.
3. Extracts only `{ id, course, title, dueDate, receivedAt }`.
4. Serves that as JSON from a web-app URL.

Mission Control fetches that URL. That is the whole integration.

Why this wins:

- **No restricted scope in the app.** No CASA, no verification, no warning screen.
- **No token in `localStorage`.** Nothing to leak.
- **Minimum disclosure.** The app sees four parsed fields, never message bodies,
  never your inbox.
- The script runs as you, on Google's infrastructure, under your own quota.

Practical notes: deploy with access "Anyone", return via `ContentService` with
`MimeType.JSON`, and have the client send a **`text/plain`** request so the
browser treats it as a simple request and skips the CORS preflight — Apps Script
does not answer `OPTIONS`. Put an unguessable token in the query string, because
"Anyone" means anyone with the URL.

### Route B — Gmail API directly from the browser

Technically fine (§1.3), materially worse: the unverified-app screen, a
re-authorise click, a mailbox-wide read token living in a web page, and exposure
to Google tightening personal-use rules later. Reach for this only if the Apps
Script route is unavailable.

### Route C — Paste or forward *(always build this one)*

A box that accepts pasted email text, or a "forward to yourself and paste"
workflow, parsed by the same extractor as Route A.

This is not a consolation prize. It is the fallback that guarantees the feature
works when the network is down, the script is broken, or Google changes its mind
— and it is the only route with **zero** external dependencies. Build the parser
first, standalone and unit-tested; then A and C are the same code with different
front doors.

### 3.1 Two rules the importer must obey

**Idempotence.** Key every imported item on the Gmail message id. Re-running the
import, or restoring a backup, must never create a second copy of an assignment.
This is precisely the `id` / `ref` discipline from §8.1, applied to a new source.

**Never silently trust a parsed date.** Deadlines extracted from prose are wrong
often enough that auto-committing them would quietly corrupt your schedule.
Imported items land in a **review queue** — course, title, proposed due date,
and the source line the date came from — and become commitments only when you
confirm. An importer that guesses wrong and says nothing is worse than no
importer.

---

## 4. How task progress should work

### 4.1 The model

Today a task's progress is one thing: ticked steps ÷ total steps. The
generalisation is to let a task **declare where its progress comes from**:

```ts
type ProgressSource =
  | { kind: "steps" }                                   // manual checklist — today's behaviour
  | { kind: "video"; videoId: string; threshold: number } // watched coverage
  | { kind: "session"; targetMinutes: number }            // measured focus time
  | { kind: "deadline" };                                 // a commitment; no intrinsic progress
```

Progress is then a pure function — `(task, ledger, cursors) => 0..100` — and
every existing task keeps working unchanged, because `{ kind: "steps" }` is what
they already are.

### 4.2 The five rules

1. **Progress is derived, never stored.** Cursors are *inputs* to the function,
   never the answer. (§2.2)
2. **Progress is display; completion is the event.** Continuous progress may
   animate freely on screen. Only crossing the threshold writes to the ledger —
   once, with a stable `ref`. This avoids a stream of micro-events and keeps undo
   working as removal. (§2.6)
3. **Measured is not declared.** Video and focus time are *measured* and count
   toward total hours. Ticking a box is *declared* and does not. This is §2.10
   extended to video, and it is what stops "hours" from becoming a vanity number.
4. **Coverage, not position.** See §4.3.
5. **Finer slicing must never pay more.** A video split into ten "parts" cannot
   out-earn the same video as one. The fixed-pot rule (§2.11) applies unchanged.

### 4.3 Anti-gaming: measure coverage, not furthest point

The naïve implementation — "progress = furthest position reached" — is defeated
by dragging the scrubber to the end. The e-learning field settled this long ago,
and the xAPI Video Profile standardises it: record **played segments**, and take
progress as the **union of intervals actually played**, as a fraction of
duration.

So: accumulate `[start, end)` intervals on each `PLAYING → PAUSED/ENDED`
transition, merge overlaps, and compute coverage. Scrub to 95% and coverage is
still ~0%. Watch honestly and it climbs honestly.

Two refinements worth having:

- **Threshold below 100%.** Require ~90%, not 100% — end credits and sign-offs
  are not learning, and demanding the final second is the kind of pedantry that
  makes people fake it.
- **Keep the maximum.** If you finish at 95% and then rewatch the first minute,
  coverage must not fall to 5%. Coverage is monotonic within an episode; only an
  explicit untick reverses it.

---

## 5. What this fixes that is already broken

Research turned up an existing defect worth recording independently of whether
any of the above is built.

**Series credit estimated minutes as measured time.** `use-series.ts` declares
`minutesPerEpisode` — *"Minutes credited per episode — used for measured-time
stats"* — defaulting to **12** for YouTube imports and **20** for manual ones.
`SeriesTracker.tsx` then logs `minutes: s.minutesPerEpisode` onto a `study`
event, which flows straight into "Total Hours" in the Hall of Mastery.

That is a guess being counted as measurement, and it contradicts §2.10 —
*"Only real elapsed time contributes to total hours... estimates are stored but
deliberately excluded."* A 90-minute lecture currently books 12 minutes; ten
short clips book 120.

Two fixes, independent of each other:

- **Cheap and immediate:** the YouTube Data API returns real
  `contentDetails.duration` on `videos`/`playlistItems`. Import it. A guess
  becomes a real length. (Still a *length*, not time-you-spent — better, not
  honest.)
- **Correct:** with the IFrame player, log the seconds **actually played**. That
  is measurement, and "Total Hours" becomes true again.

---

## 6. XP — deliberately left alone

The economy (§7.2) and the curve (ADR-006) are frozen. This proposal therefore
recommends **no XP changes**:

- An episode completion keeps paying its current flat rate.
- Watch time corrects the *minutes* recorded, not the XP awarded.
- An imported assignment pays **nothing** on import, and pays the normal task pot
  when completed like any other task.

If watch time should instead earn XP through the focus decay curve — defensible,
since it is genuinely measured effort — that is a real economy change and needs
its own ADR, with the same arithmetic ADR-006 got. Do not slip it in.

One smell noted in passing: `SeriesTracker.tsx` awards `xp: XP.journal` for an
episode, with the comment *"one deliberate piece of learning"*. It happens to be
the right number, but a study event should not be priced by pointing at the
journal rate. Worth a named constant.

---

## 7. Recommended build order

Each step is independently useful and independently shippable.

| # | Step | Depends on | Notes |
|---|---|---|---|
| 1 | Real durations from the Data API | — | Kills the 12-minute guess. Hours get better immediately. |
| 2 | The email parser, standalone + tested | — | Pure function, no I/O. Powers routes A and C. |
| 3 | Paste-an-email import + review queue | 2 | Feature complete with zero external dependencies. |
| 4 | `ProgressSource` model + `{kind:"steps"}` migration | — | Pure refactor, no behaviour change. |
| 5 | Cursor store + IFrame player + coverage | 4 | The real feature. Automatic video progress. |
| 6 | Apps Script bridge | 2, 3 | Turns the paste box into an automatic feed. |

Step 1 alone repairs a live correctness bug. Steps 2–3 deliver assignments-from-
email with no OAuth at all. Steps 4–5 deliver automatic video progress. Step 6 is
the convenience layer on top of an already-working feature — deliberately last,
because it is the only step with an external dependency that can rot.

---

## 8. Decisions needed before any of this is built

1. **Is "progress only for video watched inside Mission Control" acceptable?**
   If the expectation is that watching on youtube.com updates the app, the
   feature cannot be built — see §1.1 — and it should be declined rather than
   approximated.
2. **Apps Script bridge, or direct Gmail API?** Recommendation: Apps Script
   (§3, Route A), with paste (Route C) built first regardless.
3. **Does the cursor-store concept get approved?** It is a new store, and §9
   rule 2 means adding one is an architectural decision, not an implementation
   detail. Recommendation: yes, on the strict terms in §2 — no statistic may
   ever read it.
4. **Confirm XP stays frozen** (§6), so measured minutes improve without the
   economy moving.
5. **Should §5 be fixed now, separately?** It is a live §2.10 violation and does
   not depend on anything else here.

---

*Research sources: YouTube Data API revision history (watch history deprecation,
11 Aug 2016); YouTube IFrame Player API reference; Google restricted-scope
verification and CASA requirements; Google OAuth token lifetime in Testing
status; Apps Script `ContentService` and CORS behaviour; xAPI Video Profile
played-segments.*
