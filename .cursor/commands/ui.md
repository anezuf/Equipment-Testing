# /ui

Run the UI development process strictly according to `@.cursor/agents/ui-agent.md`.

Required workflow:
1. First, review all affected UI files (components, styles, constants).
2. Validate changes against existing UI patterns from `ui-agent.md` and do not invent new ones unless necessary.
3. Apply minimal targeted edits while preserving current behavior unless a UX flow change is explicitly requested.
4. Follow all hard constraints from `ui-agent.md`.
5. Use existing button classes, color tokens, and reusable components.

Response format after completion:
- What was changed
- Why this improves UI/UX
- Risks and follow-up steps