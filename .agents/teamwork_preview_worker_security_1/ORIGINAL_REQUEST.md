## 2026-07-07T13:51:09Z

You are teamwork_preview_worker.
Your working directory is: /Users/0xshashank/Downloads/app/.agents/teamwork_preview_worker_security_1/
Your identity: Security Worker 1
Milestone: security
Project Scope Document: /Users/0xshashank/Downloads/app/.agents/orchestrator/PROJECT.md
Synthesized Audit Report: /Users/0xshashank/Downloads/app/.agents/orchestrator/analysis_security.md

Task:
Implement security remediation fixes directly in the project codebase for the security audit findings in the Synthesized Audit Report.

Specifically, implement the following:
1. Firebase Configuration Environment Variables:
   - Create a `.env` file at the project root `/Users/0xshashank/Downloads/app/` containing the Firebase credentials:
     ```env
     VITE_FIREBASE_API_KEY=AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E
     VITE_FIREBASE_AUTH_DOMAIN=id-card-login.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=id-card-login
     VITE_FIREBASE_STORAGE_BUCKET=id-card-login.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID=196978536104
     VITE_FIREBASE_APP_ID=1:196978536104:web:a14cb81df8218191c31c9d
     VITE_FIREBASE_MEASUREMENT_ID=G-DL9NVBTLX9
     ```
   - Create a `.env.example` file at the project root with the same keys but empty placeholder values.
   - Modify `src/lib/firebase.ts` to load all Firebase config properties from `import.meta.env.VITE_FIREBASE_...` instead of hardcoded strings.
2. Insecure CORS Bypass & Public Proxy Removal:
   - In `src/components/DataImport.tsx`, remove the fallback fetching via `api.allorigins.win`. If the direct image fetch fails, show a clean error state without passing user images to public proxies.
   - Remove the tip warning/text proposing users run Chrome with `--disable-web-security` or use CORS unblocking extensions.
3. SSRF Mitigation in cURL Imports:
   - In `src/components/DataImport.tsx`, sanitize cURL target URLs. Add validation to check if the URL is absolute and uses `http:` or `https:`. Restrict target domains to known public endpoints or clearly warn the user before making requests to arbitrary external URLs.
4. Shoulder Surfing & Token Leakage:
   - In `src/components/DataImport.tsx`, clear or mask the cURL text input once the import starts or finishes to prevent authentication tokens from remaining visible in plaintext.
   - Sanitize all error logging and UI errors in `src/components/DataImport.tsx` so that `console.error` and state error variables do not log or print raw error/request objects containing tokens or keys. Log/print `err.message` or a generic description instead.
5. Canva Iframe Sandboxing:
   - In `src/components/CardRenderer.tsx` (lines 363-380), add a `sandbox` attribute (e.g., `sandbox="allow-scripts allow-same-origin"`) to the Canva embed iframe to prevent potential script execution/redirections outside the frame.
6. Form Input Validation & Length Limits:
   - In `src/components/OrganizationSetup.tsx` and `src/components/LoginPage.tsx`, add input validation (email format, website URL format, maximum character length limits like 100 for name/tagline, 20 for phone/OTP, 255 for email/website) to prevent UI breakage or excessive storage size.
7. Dependency Audit and Remediation:
   - Run `npm audit` on the project.
   - Report any critical or high-severity vulnerabilities.
   - Remediate them by running `npm audit fix` or updating the specific packages in `package.json` to secure versions, then run `npm install`.

Verification:
- Run `npm run build` after changes to make sure there are no TypeScript or compilation errors.
- Document all modified files, line numbers, and changes in a handoff report `handoff.md` in your working directory.
