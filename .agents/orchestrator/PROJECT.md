# Project: ID Card Studio (ID_PRO)

## Architecture
- **Entry point**: `src/main.tsx` renders `src/App.tsx` which handles general routing and auth checks.
- **Layout**: `src/components/Layout.tsx` defines the sidebar and main workspace pages: Dashboard, Organization Setup, Template Gallery, Card Designer, Data Import, and Preview & Export.
- **State Management**: Zustand store in `src/store/index.ts` handles the application state, persisted to localStorage, and synchronized with Firestore/Supabase.
- **Components**:
  - `src/components/CardDesigner.tsx` runs the designer workspace, utilizing components in `src/components/designer/`.
  - `src/components/CardRenderer.tsx` handles raw canvas rendering.
  - `src/components/DataImport.tsx` parses Excel/CSV files and cURL commands.
  - `src/components/PreviewExport.tsx` compiles templates and card data, performing html2canvas capture and PDF stitching.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: Cybersecurity Audit & Fixes | Security audit and remediation (env vars, curl sanitize, input validation) | none | DONE |
| 2 | R2: Bug Hunt & Fixes | Bug hunting and fixes (memory leaks, setTimeout, db write debounce, placeholders) | M1 | IN_PROGRESS |
| 3 | R3: Performance Optimization | Bundle size, Zustand useShallow, image serialization in IndexedDB, React.memo | M2 | PLANNED |
| 4 | R4: Code Quality & Final Verification | Unused imports, typescript errors, console.log cleanup | M3 | PLANNED |

## Interface Contracts
- All external API calls must be validated and restricted.
- Store modifications must be debounced when writing to database/Firestore.
- Data structures should be typed properly without using `any` where possible.
