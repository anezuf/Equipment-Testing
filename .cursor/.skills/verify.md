---
name: verify
description: Run before commit. Calls all specialist agents in sequence to verify code quality, logic integrity, and UI consistency.
---

# Pre-commit verification

Run these agents in order. Stop if any agent reports a blocker.

## Step 1 — Code quality
@refactor-agent App.jsx has mixed responsibilities — extract export/import handlers to src/hooks/useExport.js and modal state to src/hooks/useModals.js. One extraction at a time, app must work after each step.

## Step 2 — Logic integrity  
@logic-agent
Verify vendor arrays match itemCount, localStorage keys are correct, no cross-layer data corruption.

## Step 3 — UI consistency
@ui-agent
Check that all new buttons use correct classes, styles match existing patterns, no new variants invented.

## Step 4 — Build
Run: npm run lint && npm run build
Both must pass before committing.

## Done
If all steps pass → git save
If any step has blockers → fix first, then repeat from that step.
```

Коротко, без Playwright, без чеклиста на 30 пунктов. Вызываешь одной командой:
```
@verify