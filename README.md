# rack-audit

Single-page web app for **comparing rack and PDU vendors** against a customizable technical checklist. You edit parameters and weights, score each vendor (with notes and photos), and view totals on a dashboard. Data persists in the browser via `localStorage`; you can export to Excel.

## Features

- **Tech specs** — Structured checklist parameters (with optional detail text for scoring hints). Separate **Стойка** / **PDU** datasets; each tab remembers its own equipment type toggle.
- **Editor** — Per-parameter weight: Преимущество (excluded from score), Требование, or Критичное требование. Weights merge with tech specs to build the scoring checklist.
- **Scoring** — Multiple vendors (up to 10), per-item score, rich-text notes, image attachments. Scoring formulas live in `src/scoring.js` (single source of truth).
- **Dashboard** — Section and total scores, heatmap-style view, charts.
- **Export** — Excel export for tech specs and vendor forms (text data; images are not embedded in sheets).
- **Print** — Print-friendly layout (navigation hidden via shared print styles).

## Tech stack

- [React](https://react.dev/) 19 + [Vite](https://vite.dev/) 8
- [ExcelJS](https://github.com/exceljs/exceljs), [SheetJS (xlsx)](https://sheetjs.com/) for spreadsheets

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

| Script        | Description              |
| ------------- | ------------------------ |
| `npm run dev` | Development server + HMR |
| `npm run build` | Production build       |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint                   |

## Project layout (high level)

| Area | Location |
| ---- | -------- |
| App shell, global state, routing between views | `src/App.jsx` |
| Scoring math (`calcTotal`, `calcSec`, `hasFail`) | `src/scoring.js` |
| Section/checklist helpers | `src/sections.js`, `src/data/` |
| Vendor state and array resizing | `src/hooks/useVendors.js` |
| Persistence (`localStorage`, keys per equipment type) | `src/hooks/useStorage.js` |
| Feature UI | `src/components/features/` |
| Shared UI | `src/components/ui/` |

## Data model (short)

- Two equipment types: **`стойка`** and **`pdu`**. Tech specs, editor weights, and scoring data are stored **separately per type**; the active type can differ per main tab (specs / editor / scoring).
- Vendor rows keep `scores`, `notes`, and `images` arrays aligned with the current checklist length — see in-repo rules under `.cursor/rules/` for constraints when changing parameters or weights.

## Contributing / development notes

- Prefer small, focused changes; keep imports used and avoid duplicating scoring logic outside `src/scoring.js`.
- After substantive edits, run `npm run build` and `npm run lint` to confirm the app still compiles cleanly.

---

*Internal agent context for scoring and data flow is documented in `.cursor/agents/scoring-agent.md`.*

---

## Документация на русском

**rack-audit** — одностраничное веб-приложение для **сравнения вендоров стоек и PDU** по настраиваемому техническому чеклисту. Вы задаёте параметры и веса критериев, выставляете оценки каждому вендору (с заметками и фото) и смотрите сводку на дашборде. Данные сохраняются в браузере (`localStorage`); есть выгрузка в Excel.

### Возможности

- **Технические характеристики** — структурированный чеклист параметров (при необходимости — поясняющий текст для подсказок при скоринге). Отдельные наборы для **стойки** и **PDU**; у каждой основной вкладки свой переключатель типа оборудования.
- **Редактор** — вес каждого параметра: Преимущество (не входит в баллы), Требование или Критичное требование. Веса объединяются с техспеками в итоговый чеклист для оценки.
- **Скоринг** — несколько вендоров (до 10), оценка по пунктам, заметки в формате rich text, вложения изображений. Формулы подсчёта — только в `src/scoring.js`.
- **Дашборд** — баллы по разделам и итог, тепловая карта, графики.
- **Экспорт** — Excel для техспек и анкет вендоров (текст; картинки в файл не вшиваются).
- **Печать** — оформление под печать (навигация скрывается общими стилями).

### Стек

- [React](https://react.dev/) 19 и [Vite](https://vite.dev/) 8
- [ExcelJS](https://github.com/exceljs/exceljs), [SheetJS (xlsx)](https://sheetjs.com/) для таблиц

### Быстрый старт

```bash
npm install
npm run dev
```

Откройте в браузере адрес из вывода терминала (обычно `http://localhost:5173`).

| Команда | Назначение |
| ------- | ---------- |
| `npm run dev` | Режим разработки и горячая перезагрузка |
| `npm run build` | Сборка для продакшена |
| `npm run preview` | Просмотр собранной версии |
| `npm run lint` | Проверка ESLint |

### Структура проекта (кратко)

| Зона | Путь |
| ---- | ---- |
| Оболочка приложения, глобальное состояние, переключение экранов | `src/App.jsx` |
| Математика скоринга (`calcTotal`, `calcSec`, `hasFail`) | `src/scoring.js` |
| Разделы и чеклист | `src/sections.js`, `src/data/` |
| Вендоры и синхронизация длин массивов | `src/hooks/useVendors.js` |
| Сохранение в `localStorage` (ключи по типу оборудования) | `src/hooks/useStorage.js` |
| Экраны с логикой | `src/components/features/` |
| Переиспользуемый UI | `src/components/ui/` |

### Модель данных (кратко)

- Два типа оборудования: **`стойка`** и **`pdu`**. Техспеки, веса редактора и данные скоринга хранятся **отдельно для каждого типа**; активный тип может отличаться на вкладках «техспеки / редактор / скоринг».
- У каждого вендора массивы `scores`, `notes` и `images` всегда совпадают по длине с текущим чеклистом — ограничения при изменении параметров и весов описаны в правилах репозитория (`.cursor/rules/`).

### Разработка

- Небольшие смысловые изменения; не дублировать расчёты скоринга вне `src/scoring.js`, не оставлять неиспользуемые импорты.
- После существенных правок имеет смысл выполнить `npm run build` и `npm run lint`.

*Внутренний контекст по цепочке данных и скорингу: `.cursor/agents/scoring-agent.md`.*
