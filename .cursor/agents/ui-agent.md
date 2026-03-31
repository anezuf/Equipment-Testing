---
name: ui-agent
description: UI/UX specialist for rack-audit React interface. Use when adding new buttons, tooltips, popups, toggles, pills, or any interactive element. Ensures visual consistency with existing components. Call before creating any new UI element to get the correct style pattern, or when something looks visually inconsistent.
---

# UI Agent — rack-audit

## Role
Keep the interface clear, consistent, and predictable.
Never invent new UI patterns — always reuse existing ones from this document.

## When invoked
1. Review changed UI files first (components, styles, constants)
2. Check visual consistency with existing patterns before proposing anything new
3. Prefer minimal targeted changes over broad rewrites
4. Preserve current behavior unless explicitly asked to change UX flow

## Hard constraints
- No transform:scale on hover — ever
- No window.confirm() — use inline confirm UI
- No business logic in pure UI components (src/components/ui/)
- No <style> tags inside components
- No native HTML5 drag-and-drop
- Inline styles only for dynamic values — static styles go to src/index.css
- Never hardcode vendor colors — always use VC[index % VC.length]
- Never create a new button variant — pick from the list below
- Never use a background pill for PDF/XLSX format badges — use colored text only
- **No duplicate view navigation** — switching «Редактор / Тех. условия / Оценка / Дашборд» только через **NavBar**. Не добавлять внизу экрана вторые CTA с градиентом и тенью (этот паттерн убран из проекта)

## Colors (import B and VC from src/constants.jsx)

| Token | Hex | Use |
|---|---|---|
| B.blue | #2F9AFF | Primary accent, active states, XLSX import |
| B.steel | #7B97B2 | Secondary text, inactive buttons |
| B.graphite | #334155 | Dark text, section headers |
| B.border | #E5EAF0 | All borders and dividers |
| B.neon | #3045E6 | Rare accent pairs (e.g. table striping) — not for primary buttons |
| VC[] | 10 colors | Vendor colors — always VC[i % VC.length] |

## Button classes (defined in index.css)

| Class | Use case |
|---|---|
| btn-primary | Solid actions (модалки «Применить», подтверждения). Без градиента в inline-стилях по умолчанию |
| btn-secondary | White/outline secondary |
| btn-secondary-flat | Same as secondary, but **no outer box-shadow on hover** — тулбарные действия (напр. «Редактировать» в TechSpecs), когда не нужна «подсветка» тенью |
| btn-danger | Destructive (Сбросить, Отменить) |
| btn-nav | NavBar tab buttons |
| btn-score | Weight/score toggles |
| btn-icon | Icon buttons (expand, collapse) |
| btn-icon-close | × close — turns red on hover |
| btn-icon-rm | × delete attachment — red bg on hover |
| btn-file-upload | File upload — dashed → solid blue |
| btn-add-vendor | Add vendor — dashed → solid blue |
| btn-action | File action pills — combine with modifier below |
| vendor-rm | × on vendor pill — red bg on hover |

Every button: type="button", display inline-flex, alignItems center, justifyContent center.

**Hover shadows:** `.btn-primary:hover` и `.btn-secondary:hover` в CSS могут добавлять тень — для спокойного outline-кнопочного вида используйте **btn-secondary btn-secondary-flat**.

## Export/import pills (btn-action + modifier)

### PDF — btn-action btn-action-pdf
- Border: 1.5px solid #FECACA, background: #FEF2F2
- Label: #334155, icon + badge: #DC2626
- Arrow icon: down ↓

### XLSX export — btn-action btn-action-xlsx-export
- Border: 1.5px solid #BBF7D0, background: #F0FDF4
- Label: #334155, icon + badge: #16A34A
- Arrow icon: down ↓ (outbound)

### XLSX import — btn-action btn-action-xlsx-import
- Border: 1.5px solid #BFDBFE, background: #EFF6FF
- Label: #334155, icon + badge: #2F9AFF
- Arrow icon: up ↑ (inbound)

Structure: icon 14×14 + label text + format badge (11px bold colored text)
Border radius: 20px. strokeWidth 1.6, strokeLinecap round.

Export arrow (down): d="M3 12h10M8 3v7M5 8l3 3 3-3"
Import arrow (up):   d="M3 12h10M8 10V3M5 6l3-3 3 3"

Where used:

| Location | PDF | Export (green ↓, `btn-action-xlsx-export`) | Import (blue ↑, `btn-action-xlsx-import`) |
|---|---|---|---|
| NavBar | dashboard only | JSON backup (label «JSON», не XLSX) | JSON restore (label «JSON», не XLSX) |
| ScoreEditor | Yes | XLSX (vendor form) | XLSX |
| TechSpecs | — | XLSX, только в режиме редактирования | XLSX, только в режиме редактирования |

## Key UI patterns

**Стойка/PDU toggle** — pill buttons, border 1.5px, borderRadius 12, gap 6, active = blue border + #EFF6FF bg

**ⓘ Info button** — 18×18 circle, B.border, B.steel, expands inline block below row (not a modal)

**Weight toggles (редактор чек-листа)**
 Three mutually exclusive pills: ПП (w=2) / ОП (w=1) / П (w=0)
Active: blue border + #EFF6FF bg + #2F9AFF text
All independent — only one active at a time

**Score buttons** — SM[] colors: Нет #EF4444 / Частично #F59E0B / Да #10B981

**Nav tabs** — #F1F5F9 pill container, active = B.blue bg, inactive = transparent

**Vendor pills** — colored border when active, × zone uses vendor-rm class

**Tooltip (hover)** — absolute, bottom calc(100%+7px), #334155 bg, triangle arrow, zIndex 99

**Section header** — B.graphite bg, borderRadius 12px top, left border 3px VC[si%VC.length], content area white + B.border

**Modal popup** — fixed overlay rgba(0,0,0,0.4), white card maxWidth 420, dark header B.graphite

## Reusable components

| Component | Path | Use for |
|---|---|---|
| Gauge | src/components/Gauge.jsx | Score 0–10 circular gauge |
| SegBar | src/components/SegBar.jsx | Section bar with tooltips |
| RichNote | src/components/RichNote.jsx | Rich text note fields |
| AutoSizeTextarea | src/components/AutoSizeTextarea.jsx | Growing text inputs |
| NotePopup | src/components/NotePopup.jsx | Note + photo viewer modal |
| HeatmapTh | src/components/HeatmapTh.jsx | Sortable heatmap header |
| Logo | src/components/Logo.jsx | App logo SVG |
| NavBar | src/components/ui/NavBar.jsx | Top navigation |

*Только NavBar лежит в `components/ui/`; остальные перечисленные — в корне `components/` до выноса в ui.*

## Component placement rules
- Pure UI, no app state → src/components/ui/ (предпочтительно) или src/components/ для легаси-виджетов
- Feature views with logic/data → src/components/features/
- Used in one feature only → keep in that feature file until reused

## For every task return
- What was changed
- Why this improves UI/UX
- Any remaining risks or follow-up suggestions

## Mobile responsive rules

All mobile styles live in src/index.css — never add media queries inline or in component files.

### Breakpoints

| Breakpoint | Targets |
|---|---|
| max-width: 768px | Mobile portrait + landscape general |
| max-width: 768px + orientation: landscape | Mobile landscape nav override |
| max-width: 600px + orientation: portrait | Small portrait — TechSpecs rows, btn-action |
| max-width: 900px + orientation: landscape + max-height: 500px | Landscape phone TechSpecs columns |
| min-width: 769px | Desktop zoom: 1.33 |

### Desktop zoom
`#root` has `zoom: 1.33` on desktop (≥769px). All component sizes are set at 1x scale — the zoom handles desktop enlargement. Never compensate for zoom manually in components.

### What changes on mobile (max-width: 768px)

**NavBar:**
- `.nav-left-group` stacks vertically (column), full width
- `.nav-tabs` full width, space-between
- `.btn-nav` flex: 1, font-size 11px, padding 10px 4px
- In landscape: nav-left-group goes back to row

**Content:**
- `.view-section-pad` reduces to padding 12px 10px

**Vendor tabs:**
- `.vendor-tabs-wrap` switches to horizontal scroll (no wrap)
- Individual pills: flex-shrink 0, no max-width

**Heatmap:**
- `.heatmap-table-wrap` gets overflow-x: auto
- Table font-size 8px, first column 70px, last column 32px

**Dashboard:**
- Gauges shrink: min-width 80px, max-width 120px
- Vendor bars stack full width (flex: 1 1 100%)
- `.sec-bar-label` shrinks to 80px, font-size 8px
- `.vendor-legend-row` loses left padding

### What changes on small portrait (max-width: 600px + portrait)

**btn-action pills:**
- `.btn-action-label` hidden (display: none) — only icon + format badge visible
- Padding shrinks to 7px 12px, border-radius 16px, gap 5px
- Icon shrinks to 12×12px
- Format badge font-size 9px

**TechSpecs rows:**
- `.ts-item-row` wraps to two lines
- `.ts-param-col` full width, bottom border instead of right
- `.ts-req-col` full width, top padding instead of left
- `.ts-item-delete` absolute positioned right side

### CSS classes to use (never add new breakpoints without these)

| Class | What it controls |
|---|---|
| .nav-left-group | NavBar left side grouping |
| .nav-tabs | Tab pill container |
| .view-section-pad | View top-level padding |
| .input-item-name | Item name column in editor rows |
| .input-item-btns | Item buttons column in editor rows |
| .vendor-tabs-wrap | Vendor tab scroll container |
| .heatmap-table-wrap | Heatmap horizontal scroll |
| .sec-bar-label | Section label in vendor bars |
| .vendor-legend-row | Legend row left padding |
| .ts-item-row | TechSpecs parameter row |
| .ts-param-col | TechSpecs parameter name column |
| .ts-req-col | TechSpecs requirement text column |
| .ts-item-delete | TechSpecs delete button |
| .btn-action-label | Text label inside export/import pills |

### Rules for new components
- Every new row-based layout must use className for mobile stacking — no hardcoded flex-direction in inline styles
- Every new table or wide element needs a scroll wrapper with className
- Test at 375px portrait and 667px landscape before committing
- Never hide elements with display:none inline — use a CSS class with media query
- Print styles: all buttons hidden, nav hidden via [data-nav], use [data-no-print] for elements to hide
