# BRIEFING — 2026-07-07T14:38:00Z

## Mission
Investigate and document functional bugs across the codebase in `src/` as requested in the bug hunt explorer task.

## 🔒 My Identity
- Archetype: Bug Hunt Explorer 1
- Roles: Read-only investigator (analyze problems, synthesize findings, produce structured reports)
- Working directory: /Users/0xshashank/Downloads/app/.agents/teamwork_preview_explorer_bughunt_1/
- Original parent: 001b069b-b3a8-4823-981f-9a39cd78bf3b
- Milestone: bughunt

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: No external network/websites/HTTP requests

## Current Parent
- Conversation ID: 001b069b-b3a8-4823-981f-9a39cd78bf3b
- Updated: 2026-07-07T14:38:00Z

## Investigation State
- **Explored paths**:
  - `src/App.tsx`
  - `src/store/index.ts`
  - `src/components/DataImport.tsx`
  - `src/components/PreviewExport.tsx`
  - `src/components/CardDesigner.tsx`
  - `src/components/CardRenderer.tsx`
  - `src/components/TemplateGallery.tsx`
  - `src/components/Layout.tsx`
  - `src/components/LoginPage.tsx`
  - `src/components/OrganizationSetup.tsx`
  - `src/components/HelpDialog.tsx`
  - `src/components/designer/DesignerCanvas.tsx`
  - `src/components/designer/LayersPanel.tsx`
  - `src/components/designer/PropertiesPanel.tsx`
  - `src/components/designer/DesignerToolbar.tsx`
  - `src/hooks/useDragResize.ts`
- **Key findings**:
  - Favicon memory leak in `src/App.tsx` (missing Blob URL revocation).
  - 1200ms login delays in `src/App.tsx` and `src/components/LoginPage.tsx`.
  - Non-debounced, synchronous Firestore writes in Zustand store `src/store/index.ts`.
  - Default card address placeholder `'School Address, City'` in `src/store/index.ts`.
  - CORS image fetch failure clears photo URL in `src/components/DataImport.tsx`.
  - Selection overlay and resize handles in `DesignerCanvas.tsx` and `useDragResize.ts` do not support rotated elements.
  - Editable custom keys in `OrganizationSetup.tsx` can break template bindings.
- **Unexplored areas**:
  - None.

## Key Decisions Made
- Propose `debounceByKey` helper to solve the Zustand store sync problem.
- Retain raw URL on CORS download failure to prevent silent data loss.
- Rotate the selection overlay wrapper element in `DesignerCanvas.tsx` to align with rotated elements.

## Artifact Index
- /Users/0xshashank/Downloads/app/.agents/teamwork_preview_explorer_bughunt_1/analysis.md — Report detailing findings of functional bug hunt.
- /Users/0xshashank/Downloads/app/.agents/teamwork_preview_explorer_bughunt_1/handoff.md — Handoff report for next agent or main coordinator.
