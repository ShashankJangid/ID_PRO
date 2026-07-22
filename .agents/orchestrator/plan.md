# Security Audit, Bug Hunt, and Performance Optimization Plan

This plan coordinates the security audit, bug fixes, and performance optimization for the **ID_PRO** application.

## Objectives
1. **Cybersecurity Audit**: Identify and resolve security vulnerabilities (Firebase configuration, XSS, SSRF in cURL parser, Firestore rules, `npm audit` packages, input validation, key exposure, auth token logging).
2. **Bug Hunt**: Identify and fix functional bugs (memory leaks in App.tsx/PreviewExport.tsx, UI blocking timeouts, non-debounced Firestore writes, placeholder values, unsafe fetches, CORS handling, etc.).
3. **Performance Optimization**: Improve bundle size, rendering performance, Zustand store usage (`useShallow`), image persistence (Blob URL storage vs Base64 state), export pipeline, and build configuration.
4. **Code Quality**: Clean up console statements, improve TypeScript types, remove unused imports, and verify compilation.

## Milestones

### Milestone 1: Cybersecurity Audit & Vulnerability Remediation
- **Investigation**: Explore codebase for credentials, insecure Firebase usage, SSRF in `parseCurl`, XSS vulnerabilities in custom HTML or elements, missing validation, and `npm audit` issues.
- **Fixes**: Move configurations to environment variables, restrict/sanitize curl queries, sanitize inputs, resolve Firebase/Firestore risks, and fix CVEs.
- **Verification**: Run `npm audit` and ensure no high/critical vulnerabilities. Confirm auth logs don't output secrets.

### Milestone 2: Functional Bug Hunting & Fixing
- **Investigation**: Review all components (`App.tsx`, `DataImport.tsx`, `PreviewExport.tsx`, state store, designer components) for bugs and leaks.
- **Fixes**: Clean up Blob URLs (App.tsx favicon, PreviewExport.tsx iframe preloads), remove login timeout delays, implement debounce on Firestore writes, update placeholder variables.
- **Verification**: Ensure no runtime crashes and that fixes work correctly.

### Milestone 3: Performance Optimization
- **Investigation**: Analyze bundle chunks using `npx vite-bundle-visualizer` or similar. Review store subscriptions and image serialization.
- **Fixes**: Defer XLSX loading, use `useShallow` selectors in Zustand, convert base64 image store to IndexedDB blobs, implement React.memo/useCallback on CardRenderer/TemplateGallery, tweak Vite build configuration.
- **Verification**: Gzipped bundle size and chunk verification.

### Milestone 4: Code Quality Cleanup & Final Verification
- **Actions**: Clean up `console.*` outputs, replace `any` types where feasible, remove unused imports, run `npm run build` to verify compilation.
- **Verification**: Ensure zero typescript compiler errors and zero warnings.

## Schedule & Agents
- **Explorer Phase**: Spawn `teamwork_preview_explorer` to analyze vulnerabilities, bugs, and performance patterns.
- **Worker Phase**: Spawn `teamwork_preview_worker` to implement recommended fixes per milestone.
- **Reviewer/Challenger Phase**: Spawn `teamwork_preview_reviewer` and `teamwork_preview_challenger` to verify fixes.
- **Auditor Phase**: Spawn `teamwork_preview_auditor` to audit the code changes for integrity and accuracy.
