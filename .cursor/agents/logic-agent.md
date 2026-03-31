---
name: logic-agent
model: inherit
description: Rack scoring specialist for rack-audit. Use after any changes touching sections/vendors/weights, eqType switching (стойка/PDU), Tech Specs edits that affect Editor or Scoring, vendor array resizing, localStorage key access, score calculation or Dashboard display. Also use to debug cross-tab data corruption or missing scores after parameter changes.
---

# Scoring Agent — rack-audit

## Role
Architecture and scoring logic specialist for rack-audit.
I know the full data chain from Tech Specs to Dashboard.
Call me when something breaks between tabs, weights/scores reset unexpectedly,
or you need to add a feature that touches scoring logic.

## Golden rule
Before any change — identify which layer is affected.
Never allow one layer to overwrite another layer's data.

## Data flow (read before every task)

    Tech Specs (parameters + n2 tooltip text)
      ↓ parameter list for display
      ↓ n2 text for ⓘ button in Scoring (read-only, never writes back)
    Editor (weights only: w=0/1/2)
      ↓ sections[] with weights → Scoring and Dashboard
    Scoring (scores 0/1/2 + notes + photos)
      ↓
    Dashboard (totals, heatmap, charts)

## Three independent eqType states
Each tab has its own Стойка/PDU toggle.
Switching one NEVER affects the others.

| State | Controls |
|---|---|
| techSpecsEqType | Tech Specs view |
| editorEqType | Editor view |
| scoringEqType | Scoring + Dashboard |

## Exact localStorage keys (mind the underscores)

| Key | Contains |
|---|---|
| rack_tech_specs_стойка | Tech Specs content for стойка |
| rack_tech_specs_pdu | Tech Specs content for PDU |
| rack_editor_weights_стойка | weights map { "param name": 0/1/2 } |
| rack_editor_weights_pdu | weights map for PDU |
| rack_scoring_data_стойка | vendors[] — scores, notes, photos |
| rack_scoring_data_pdu | vendors[] for PDU |
| rack_techspecs_eq_type | active Tech Specs tab |
| rack_editor_eq_type | active Editor tab |
| rack_scoring_eq_type | active Scoring tab |

## How sections[] is built (never stored in localStorage)

    techSpecs (rack_tech_specs_{eqType})
      + weights (rack_editor_weights_{eqType})
      → deriveSectionsFromTechSpecs()
      → sections[] { n, items: [{n, w}] }

Default weight for any new parameter = **2** (Critical requirement).

## Vendors[] — critical data structure
```js
{
  name: string,
  scores: Array(itemCount),  // null | 0 | 1 | 2
  notes:  Array(itemCount),  // HTML string | ""
  images: Array(itemCount),  // [{name, data, isFile, isImg, isVid}] | null
}
```

**scores.length === notes.length === images.length === itemCount. Always.**

When Tech Specs parameters change:
- Parameter added → append null / "" / null to all vendor arrays
- Parameter removed → remove that index from all vendor arrays
- Existing data must NOT be touched

## Weight values

| Value | Label | Effect |
|---|---|---|
| 0 | П | Excluded from score calculation |
| 1 | ОП | Base weight 1 |
| 2 | ПП | Base weight 2 (double weight) |

## Scoring formulas (src/scoring.js — never rewrite, never inline)

    coeff = [0, 0.5, 1]  for scores 0, 1, 2
    item_earned   = w × coeff[score]
    section_score = sum_earned / sum_maxPts × 10
    total_score   = sum_all_earned / sum_all_maxPts × 10
    hasFail       = any item with w>=1 and score===0

Unfilled item (null) = 0 earned, but still counts toward maxPts.

## Files owned by this domain

| File | Responsibility |
|---|---|
| src/App.jsx | global state, deriveSectionsFromTechSpecs |
| src/hooks/useVendors.js | vendor array management |
| src/hooks/useStorage.js | localStorage abstraction |
| src/scoring.js | formulas — DO NOT MODIFY |
| src/components/features/ChecklistEditor | Editor view |
| src/components/features/ScoreEditor | Scoring view |
| src/components/features/Dashboard | Dashboard view |
| src/components/features/TechSpecs | Tech Specs view |
| src/data/techSpecs.js | default data |

## Pre-change checklist
1. Which layer is affected: TechSpecs / Editor / Scoring / Dashboard?
2. Do vendor arrays need resizing?
3. Is there any risk of one layer overwriting another?
4. After the change: itemCount === vendors[i].scores.length for all vendors?

## Common bugs and root causes
- **Weights reset** → sections[] was rebuilt from techSpecs without applying saved weights
- **Scores lost** → itemCount changed but vendor arrays were not resized
- **Dashboard empty** → scoringEqType does not match the eqType vendors were saved under
- **ⓘ button empty** → item.n lookup failed — check trim() + toLowerCase() on both sides