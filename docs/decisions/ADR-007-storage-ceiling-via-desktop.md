# ADR-007 — The Storage Ceiling Is Solved by the Desktop Build, Not by IndexedDB

**Status:** Accepted
**Date:** 10 August 2026
**Decider:** Product owner
**Resolves:** BLOCKER-2 / TD-3 (storage ceiling)
**Supersedes:** the planned "IndexedDB migration", listed as roadmap item 2 and
named the top priority in §17 since 7 August 2026.

---

## Context

`localStorage` allows roughly 5 MB. At ~271 bytes per event and ~50 events on an
active day, a committed user reaches **~4.7 MB inside a year**, and early in year
two every write begins failing. The app already detects this and refuses to fail
silently — a blocking alert appears with one-click export — but the ceiling
itself remained, and it is the one defect that destroys the thing the product
exists to protect: *"my discipline has left a permanent record."*

The planned fix was a migration to IndexedDB, which raises the ceiling
substantially but keeps every other property of browser storage: still a quota,
still cleared when the user clears site data, still invisible to backup tooling,
still per-browser-profile.

On **10 August 2026** the product owner confirmed the final product is a
**Windows desktop application built with Tauri**, with the browser retained as
the development and UI-testing surface. That changes what the right fix is.

## Decision

**Do not build the IndexedDB migration.** Solve the storage ceiling by writing to
the filesystem in the Tauri build, behind the existing `StorageAdapter` contract.

A desktop implementation gets, for free, every property IndexedDB would not have
given:

| | localStorage | IndexedDB | Tauri filesystem |
|---|---|---|---|
| Practical ceiling | ~5 MB | large, still a quota | disk |
| Survives "clear site data" | no | no | **yes** |
| User can back it up themselves | no | no | **yes — it is a file** |
| Readable without the app | no | no | **yes — plain JSON** |
| Work to reach it | — | a migration | an adapter |

The last row is the decisive one. IndexedDB is a migration *plus* an adapter,
and it is thrown away the moment the desktop build lands. The adapter is needed
either way.

## Why this is safe to defer rather than urgent

The ceiling is a function of real usage, and the only ledger in existence is test
data. The existing protections are already in place and already verified:

- writes report failure rather than swallowing it (`WriteResult`),
- a blocking alert appears at 70% usage and again when writes fail,
- export includes every store and is one click away.

So the failure mode between now and the desktop build is *loud and recoverable*,
not silent and terminal. That is what makes deferring defensible; it would not be
if the app could lose data quietly.

## Consequences

- Roadmap item 2 ("IndexedDB migration") is **withdrawn**, not postponed.
- §17's current priority is vacated. The next priority is core functionality and
  polish, per the owner's direction, on the platform-independent architecture.
- `StorageAdapter.usage()` already returns `null` where there is no meaningful
  quota, so `StorageAlert` disappears by itself on desktop. No UI work is needed
  when the adapter lands.
- The one-time migration is **browser → desktop**, not localStorage → IndexedDB:
  export from the browser, import into the desktop app. Both paths already exist
  and are tested.
- If the desktop build is ever abandoned, this decision must be revisited —
  TD-3 returns exactly as it was.

## Alternatives rejected

**Build IndexedDB now anyway, as insurance.** Rejected: it is a migration whose
entire value evaporates on the desktop build, and it would write data into a
second store that then needs migrating *again*. Insurance against a risk that is
already loud and recoverable is not worth a store migration.

**Do nothing and let localStorage ride into the desktop build.** Rejected as a
*final* answer, though it is the correct interim one. Tauri's WebView2 has
localStorage, so the app would run unmodified on desktop — and quietly keep the
5 MB quota and the clear-site-data vulnerability that are a main reason to go
desktop at all. Swapping the adapter must be a deliberate step in the desktop
work, not an assumption. **This is the trap to avoid.**
