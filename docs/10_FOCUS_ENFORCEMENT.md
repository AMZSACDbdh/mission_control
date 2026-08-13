# Focus Enforcement — Design Proposal

**Status:** Proposal. Awaiting decisions in §8. Nothing here is built.
**Date:** 10 August 2026
**Depends on:** the Windows desktop build (§3.1b). None of Part A or B is
possible in a browser.
**Touches frozen rules:** §1 (never manipulate), §2.5, §2.6, §2.10, §2.16.

---

## 0. The one-paragraph version

A small always-on-top pill in the corner of the screen showing the running timer
and the task it belongs to, so checking the clock never costs a context switch.
Plus an intervention that fires **at the moment you defect**, not on a schedule.
Explicitly *not* a reminder that nags you every half hour — the evidence says
that shape fails, and the philosophy in §1 says it is the wrong thing to build.

---

## 1. What the research constrains

Three findings govern every decision below. Full sourcing in the session notes;
summarised here because they are the reason the design looks like this.

**Awareness alone barely works.** The systematic review of digital self-control
tools found interventions relying purely on raising awareness were "barely
effective", and that sanctions "have to be sufficiently difficult to overcome,
as they will otherwise be quickly dismissed".

**The transition is the expensive moment.** Recovering from a digital
interruption averages **23 minutes 15 seconds**, with two intervening tasks
before returning. Average attention on a screen is now ~47 seconds. Anything
that intervenes *after* you have drifted is arriving far too late.

**Repetition destroys reminders.** The easier a reminder is to dismiss without
acting, the more likely it fails; brains habituate rapidly to repetitive alerts.
A prompt that fires on a timer works for a few days and becomes wallpaper.

The distinction the whole design rests on:

> An **alert** demands a response and gets habituated to.
> **Ambient state** is just there, like a clock, and never has to be dismissed.

Part A is ambient. Part B is an alert, and is therefore rationed hard.

---

## 2. Part A — the focus HUD

A small window, top-right, floating above other applications.

### 2.1 What it shows

Nothing that is not immediately actionable:

- time remaining, large enough to read at a glance
- the task the session is bound to, truncated to one line
- a thin progress line
- state when it is not simply running: *paused*, *break*, *done*

That is the whole list. The moment it grows into a dashboard it becomes
something you look **at** instead of through, and it has defeated itself.

### 2.2 Window configuration

Every capability needed exists in Tauri v2:

| Requirement | Mechanism |
|---|---|
| Floats above other windows | `alwaysOnTop: true` / `setAlwaysOnTop()` |
| No title bar or chrome | `decorations: false` |
| Transparent background | `transparent: true` |
| Absent from taskbar and Alt-Tab | `skipTaskbar: true` |
| Placed in the corner | `setPosition()` |
| Follows across virtual desktops | `setVisibleOnAllWorkspaces(true)` |
| Clicks pass through it | `setIgnoreCursorEvents(true)` |
| Movable without a title bar | `data-tauri-drag-region` |

### 2.3 Interactive, not click-through, by default

Tempting to make it click-through so it never obstructs anything. **Recommended
against as the default**, because it defeats the purpose: the HUD exists so you
never have to leave your work to see or control the timer. If you cannot click
pause, you must Alt-Tab to pause — which is the context switch this feature was
built to remove.

So: interactive, small, cornered, draggable, with position remembered.
`setIgnoreCursorEvents(true)` stays available as a toggle for when it genuinely
sits over something that matters.

### 2.4 It is nearly free, because of a decision already made

The HUD is a second webview and cannot share React state with the main window.
Normally that means an event stream and a synchronisation bug waiting to happen.

It does not here, because the timer is **anchored to the wall clock** rather than
counted in ticks (§16 item 6). The session cursor already persists
`runStartedAt`, `bankedMs` and `presetId`. The HUD reads that and computes the
countdown itself. Two windows, no shared state, no drift — they agree because
they are both reading the same clock.

Only *changes* — pause, resume, skip, finish — need to cross the boundary, and
those are rare discrete events rather than a stream.

### 2.5 Honest limits

- **Exclusive-fullscreen applications win.** Some games and video players bypass
  always-on-top entirely. Borderless-windowed fullscreen is fine. Not fixable.
- Two always-on-top windows compete; the last one raised wins.
- Multi-monitor: position within the **active monitor's work area**, not global
  screen coordinates, or it lands off-screen or under the taskbar.

---

## 3. Part B — intervention, at the transition only

### 3.1 What is deliberately not built

**A reminder that fires because time has passed.** No "you have not worked in 30
minutes". It is the most obvious feature here and it is the wrong one:

- maximally dismissible, therefore per the research most likely to fail;
- habituated to within days;
- and it cannot tell whether it is interrupting a distraction or interrupting
  *real work* — in the second case it inflicts the very 23-minute cost it exists
  to prevent.

There is also a philosophical objection. §1: progression exists to *record and
celebrate disciplined living honestly — never to manipulate behaviour*. A prompt
that nags on a schedule is guilt on a timer. It belongs to a different product.

### 3.2 What is built instead

The trigger is an **event**, not an interval:

> You are in a focus session, and the application you just brought to the
> foreground is one you previously declared a distraction.

That fires at the moment of switching — the moment the research says matters —
it is rare, and it cannot cry wolf, because it only speaks when it is certainly
right. With OS-level foreground detection this is precise: Alt-Tabbing to the
editor is not a defection and produces silence.

### 3.3 Escalation, not repetition

The same event met with a rising cost, rather than the same nag forever:

| Occurrence | Response |
|---|---|
| First | The HUD pulses. Nothing else. No modal, no sound. |
| Second | Full-screen interstitial: the task, time remaining, and a deliberate dismiss. |
| Third | The application or site is blocked for the remainder of the session. |

Blocking only ever applies to a list **you wrote in advance**, and only for the
duration of a session **you chose to start**. Never a default, never a surprise.

### 3.4 Two hard rules

**Never fire during genuine work.** If the foreground application is on the work
list, say nothing. One false accusation and the user learns to ignore the system,
which costs more than every correct intervention gains.

**Never punish in the ledger.** A distraction event is telemetry for the session,
not a ledger entry. §2.5 permits XP only for completed work, and §2.6 forbids
compensating events. The session's single focus event already carries
presence-scaled XP frozen at log time — that is the entire mechanism, and it is
sufficient.

---

## 4. Part C — idle auto-pause

The one time-based trigger that earns its place, because it is not motivational.

No keyboard or mouse input for N minutes while a session runs means you left.
The correct response is to **pause the timer**, not to scold you.

This is a §2.10 concern rather than a focus one: only real elapsed time may
count toward measured hours, and a session that ran while you were at lunch is
an estimate wearing a measurement's clothes. `GetLastInputInfo` gives this
precisely, with no elevation.

**Design note:** idle while the app is foreground is also the closest thing to
observing the phone in your hand — the blind spot no desktop tool can see
directly. Report it as inference, never as fact.

---

## 5. Platform contracts this needs

Consistent with §3.1b: contracts are added when the feature that needs them is
built, everything is async, and the web implementation reports honestly rather
than faking.

**`PresenceAdapter` — extended, not replaced.** It already carries
`fidelity: "tab" | "window" | "system"`, chosen for exactly this. The desktop
implementation returns `"system"` and adds:

```ts
/** Foreground application, or null below `system` fidelity. */
foregroundApp(): Promise<{ processName: string; windowTitle: string } | null>;
/** Seconds since last keyboard or mouse input, or null below `system`. */
idleSeconds(): Promise<number | null>;
```

`use-distraction-shield.ts` needs **no change at all** — it already consumes
`platform.presence` and already surfaces `fidelity`.

**`OverlayAdapter` — new.** `show()`, `hide()`, `setClickThrough(on)`,
`setPosition(corner)`. Unsupported on web.

**`BlockingAdapter` — new, and only for §3.3 tier three.** `start(list)`,
`stop()`. Unsupported on web.

Capability flags `canObserveSystemPresence` and `canBlockDistractions` already
exist and are already `false` on web.

---

## 6. What must not be built

Recorded so it is not rediscovered as a good idea later.

- **Timed nagging.** §3.1.
- **Anti-tamper.** No blocking Task Manager, no resisting termination, no
  disabling the uninstaller. It makes the application behaviourally
  indistinguishable from malware, and Tauri binaries already trip SmartScreen
  unsigned. Note also that **EV certificates no longer bypass SmartScreen** —
  the common advice to buy one for that reason is out of date.
- **Negative XP for distraction.** §2.6.
- **Any claim to see the phone.** State the inference; never dress it as fact.

The intended sanction is *cost*, not *impossibility*: quitting early is allowed,
and the presence-scaled XP records it truthfully. Truth is the sanction. That
also keeps the whole feature inside §1.

---

## 7. Build order

Each step is independently useful and independently shippable.

| # | Step | Needs | Admin? |
|---|---|---|---|
| 1 | The HUD, ambient only — no alerts | Tauri window + overlay adapter | No |
| 2 | Idle auto-pause | `GetLastInputInfo` | No |
| 3 | System presence (foreground app) | `GetForegroundWindow` | No |
| 4 | Transition interstitial, tiers one and two | 3 + a declared distraction list | No |
| 5 | Blocking, tier three | Blocking adapter | Varies |

Steps 1–4 need no elevation and no blocking machinery. Step 5 is the only one
that does, and it is deliberately last — everything before it is useful without
it.

---

## 8. Decisions needed

1. **Should the HUD appear outside a focus session?** A permanent "0 of 3 done"
   pill floating all day is either a useful conscience or precisely the ambient
   guilt §1 rejects. *Recommendation: session-only.*
2. **How hard should tier three be?** Recommendation: real blocking during a
   session you started, no anti-tamper, quitting always possible.
3. **Idle threshold.** Recommendation: 5 minutes to pause, and count the pause
   from the last input rather than from detection, so the missing minutes are
   not silently credited.
4. **Does step 1 justify starting the Tauri build?** The HUD is the first feature
   that cannot exist in the browser at all. Standing them up together is
   reasonable; so is finishing core functionality first. *This is a scheduling
   call, not an architectural one.*

---

*Research behind this: Mark (interruption recovery, attention span), Leroy
(attention residue), Biedermann et al. and the ACM TOCHI meta-analysis (digital
self-control tool effectiveness), notification-fatigue literature, Tauri v2
window API, Win32 `GetForegroundWindow` / `GetLastInputInfo`, ActivityWatch's
watcher architecture, Cold Turkey's enforcement model.*
