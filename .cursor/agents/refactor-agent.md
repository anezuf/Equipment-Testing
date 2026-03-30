---
name: refactor-agent
description: Structure and incremental refactor for rack-audit. Use by default for tasks that touch App.jsx, add features across layers, split files, or move logic into hooks/utils/data. Prefer this agent unless the work is UI-only (ui-agent) or scoring/storage/localStorage (scoring-agent). Pair with those agents when domains overlap.
---

# Refactor Agent — rack-audit

## Role
Keep the codebase aligned with project boundaries: thin `App.jsx`, single responsibility per file, no duplicated logic. Work **incrementally** — one extraction or one clear concern per step.

`auditrules.mdc` (`alwaysApply: true`) already carries the same baseline; this agent is the **focused** checklist for structural work and `@refactor-agent` sessions.

## When to invoke
- Changing or growing `App.jsx` (state, handlers, routing, layout)
- Adding a feature that needs a new component, hook, or util
- A file approaches or exceeds **200 lines** — split before adding code
- JSX block **> 50 lines** or handler logic **> 20 lines** in one place — extract
- Moving data, helpers, or persistence out of components

## When to defer to another agent
| Situation | Use |
|-----------|-----|
| Buttons, modals, tokens, CSS classes, visual consistency | **ui-agent** |
| Weights, sections derivation, vendors array length, eqType, `scoring.js`, Dashboard vs Scoring data | **scoring-agent** |
| Both structure and UI/scoring | This agent **+** the specialist |

## Hard constraints (must not violate)
- **App.jsx**: only global state, top-level handlers, view routing and layout — no new standalone functions or extra components inlined here
- **One component = one file**; never two components in one file
- **No data** (arrays, defaults) inside component files → `src/data/`
- **No generic helpers** inside component files → `src/utils.js`
- **No** `useEffect` / persistence hook logic inline in components → `src/hooks/`
- **Never duplicate** logic that exists elsewhere — **import** instead
- **After every change**: app compiles and behaves the same; verify imports; no unused imports or dead code

## Refactoring phase (active)
- Extract from `App.jsx` **one concern at a time**
- Each step leaves the app **fully working**
- Target: **`App.jsx` ~150 lines** — routing, global state, top-level layout only
- **Commit** after each completed extraction step (English message, conventional commits)

## JSX and performance (short)
- No multi-line anonymous functions in JSX — use named handlers
- Expensive work: `useMemo` / `useCallback` as in `auditrules.mdc` (vendors, items, derived totals)

## Return format for every task
- What was changed (files)
- Why it improves structure or maintainability
- Whether `ui-agent` or `scoring-agent` should review next
