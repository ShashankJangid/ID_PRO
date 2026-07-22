# Original User Request

## Initial Request — 2026-07-07T13:42:12Z

Perform a comprehensive security audit, bug hunt, and full performance optimization of **ID_PRO** — a production React 19 + Vite 8 + TypeScript SPA for generating, designing, and bulk-exporting ID cards. The app uses Firebase Auth, Firestore, Zustand state, IndexedDB persistence, jsPDF + html2canvas export, XLSX file import, and a curl-based API data import feature.

Working directory: /Users/0xshashank/Downloads/app

Integrity mode: development

---

## Requirements

### R1. Cybersecurity Audit and Fixes

Identify and fix all security vulnerabilities across the entire codebase. At a minimum, audit:

- **Firebase configuration hardening**: The Firebase API key and config are stored in plaintext in `src/lib/firebase.ts`. Evaluate whether they need to move to environment variables (`.env`) and if there is any risk given the current Firebase security rules setup.
- **XSS / injection risks**: The app renders user-supplied content (card data, template elements, organization fields) and has a `parseCurl` function in `DataImport.tsx` that parses and executes external curl commands. Evaluate every data flow path for potential XSS injection vectors, especially rendered HTML content.
- **API data import SSRF risk**: In `DataImport.tsx`, the curl parser (`parseCurl`) allows users to input arbitrary URLs that get fetched from the user's browser. Identify what data can be exfiltrated or reached using this feature, especially if any internal IPs or credentials could be sent.
- **Firestore rules**: The app writes to Firestore paths like `users/{userId}/templates/{templateId}` and `users/{userId}`. Check if the store code (`src/store/index.ts`) allows any cross-user data access.
- **Dependency vulnerabilities (CVE scan)**: Run `npm audit` and report all critical/high severity vulnerabilities with remediation steps.
- **Input validation**: Audit all form inputs (email, phone OTP, organization name, card data fields) for missing validation or sanitization that could cause runtime errors or injection.
- **Credential or key exposure**: Search the entire codebase for hardcoded secrets, tokens, API keys, or any value that should not be in source code.
- **Auth token handling**: Check how Firebase auth tokens are passed or stored. Ensure no sensitive tokens are logged or exposed in console outputs or error messages.

Fix all critical and high severity issues directly in the source code. Document medium/low severity findings.

### R2. Bug Hunt — Fix All Bugs

Read every source file in `src/` and `src/components/` thoroughly. Identify and fix all functional bugs:

- **App.tsx**: The `generateFavicon` function runs on every `themeColor`/`themeGradientColor` change and creates a new `Blob` + `URL.createObjectURL` URL on each render without calling `URL.revokeObjectURL` on the previous one, causing a memory leak. Fix this.
- **App.tsx**: The 1200ms `setTimeout` delay on login (`logging_in` session flag) artificially blocks the UI. Remove this artificial delay.
- **store/index.ts**: `updateOrganization`, `setCardDataList`, `addTemplate`, `updateTemplate`, `deleteTemplate` all fire async Firestore writes synchronously inside Zustand's `set()` reducer calls — they should be fire-and-forget but are not debounced, so every keystroke in organization setup triggers a Firestore write. Implement debounce (min 1000ms) for profile/org saves.
- **store/index.ts**: `defaultCardData.address` is still `'School Address, City'` — update to generic placeholder.
- **DataImport.tsx**: The curl fetch call executes with user-supplied headers including potentially `Authorization` headers against arbitrary URLs. This is both a security and UX bug — the fetch should at minimum sanitize/restrict target domains or warn the user.
- **DataImport.tsx**: The `imageUrlToBase64` function performs unconstrained cross-origin image fetches via a `canvas.drawImage` approach. Check if this silently fails for CORS-restricted images and whether it needs a fallback or error state.
- **PreviewExport.tsx**: Blob URLs for preloaded images and iframe documents are created but never revoked. Add `URL.revokeObjectURL` cleanup in the iframe capture teardown.
- Look for any additional bugs in: `CardDesigner.tsx`, `CardRenderer.tsx`, `TemplateGallery.tsx`, `Layout.tsx`, `LoginPage.tsx`, `OrganizationSetup.tsx`, `HelpDialog.tsx` and all files in `src/components/designer/`.

Fix every bug found. For each fix, include a brief code comment explaining what was broken and why it's fixed.

### R3. Full Performance Optimization

Implement all available performance optimizations across the app:

- **Bundle size**: Run `npx vite-bundle-visualizer` or equivalent to identify the heaviest chunks. Look specifically at whether `DataImport.tsx` (81KB source) could be split further into sub-components or if XLSX loading can be deferred even later.
- **React rendering**: Audit all components for unnecessary re-renders. Use `React.memo`, `useMemo`, and `useCallback` where missing and where they would provide measurable improvement. Pay special attention to `CardRenderer.tsx` (called many times during bulk export) and `TemplateGallery.tsx` (renders many preview cards simultaneously).
- **Zustand selectors**: Audit all `useAppStore()` calls to ensure all components use `useShallow` selectors that pick only the state slices they need. Components subscribing to the whole store re-render on every single state update.
- **Image handling**: Audit how card images (photos, logos, signatures) are stored and rendered. Base64 images stored in Zustand state cause massive serialization overhead during IndexedDB persistence. Evaluate whether images should be stored as Blob URLs in IndexedDB separately rather than inline in the JSON state.
- **Export pipeline**: Review `PreviewExport.tsx` and the iframe-based capture loop. Verify that the concurrency limit of 3 is optimal, that images are not being re-decoded on each capture, and that PDF assembly is as tight as possible.
- **CSS**: Identify any heavy CSS animations or backdrop-filter effects still running on non-interactive pages. Replace any `filter: blur()` or `backdrop-filter` that runs continuously without user interaction.
- **`vite.config.ts` build settings**: Verify build target, chunk splitting, and treeshaking are optimal for production. Add any missing optimizations (e.g., `build.minify`, `build.cssMinify`, `build.reportCompressedSize`).

All optimizations should be implemented directly in the source code. Run `npm run build` after changes to confirm the build still passes.

### R4. Code Quality Cleanup

- Remove any remaining `console.log`, `console.warn` and `console.error` debug statements that expose internal state or error messages to end users.
- Ensure all TypeScript `any` types in critical paths (export, auth, store) are replaced with proper types where feasible.
- Remove unused imports across all files.
- After all changes, run `npm run build` to confirm there are zero TypeScript compilation errors.

---

## Acceptance Criteria

### Security
- [ ] `npm audit` returns zero critical or high severity vulnerabilities.
- [ ] No hardcoded API keys, tokens, or secrets exist in source code outside of the explicitly declared Firebase config in `firebase.ts`, and that config is evaluated for risk.
- [ ] The curl API import feature either restricts the target domain list or clearly warns the user before making requests.
- [ ] No `console.log` / `console.error` statements expose sensitive user data (auth tokens, card PII, org credentials).

### Bug Fixes
- [ ] The favicon Blob URL memory leak in `App.tsx` is fixed (previous URL revoked before creating a new one).
- [ ] Firestore writes are debounced — typing rapidly in org setup does not fire more than 1 write per second.
- [ ] `npm run build` completes with zero TypeScript or compilation errors after all changes.

### Performance
- [ ] The production bundle's largest individual JS chunk is under 400KB (gzipped).
- [ ] All `useAppStore()` calls in components use `useShallow` selectors — no component subscribes to the full store.
- [ ] `npm run build` reports total gzipped JS under 650KB.

### Code Quality
- [ ] Zero `console.log` statements remain in `src/` (excluding intentional `console.warn`/`console.error` in error handlers).
- [ ] Zero unused imports reported by the TypeScript compiler.
