# Synthesized Security Audit Report — ID_PRO

## Consensus
All completed security explorers (Explorer 2 and Explorer 3) agree on the following critical vulnerabilities:
1. **Plaintext Firebase Configuration**:
   - **Location**: `src/lib/firebase.ts` (lines 33-41)
   - **Vulnerability**: Credentials (API Key, App ID, etc.) are hardcoded in plaintext.
   - **Risk**: Hardcoded secrets are checked into version control, making environment staging difficult and risking API key misuse.
   - **Remediation**: Move credentials to Vite environment variables (`import.meta.env`) and document them in a `.env.example` template.

2. **Insecure CORS Bypass & Public Proxy Usage**:
   - **Location**: `src/components/DataImport.tsx`
   - **Vulnerability**: The app suggests that users disable Chrome web security or use browser extensions to bypass CORS blocks. Furthermore, it uses the public CORS proxy `api.allorigins.win` to retrieve images.
   - **Risk**: Disabling browser origin protections exposes the user to massive XSS/CSRF security risks. Using public proxies leaks user-supplied card holder images/URLs to a third party.
   - **Remediation**: Remove `--disable-web-security` instructions, remove `allorigins.win` proxy usage, and encourage standard CORS header configurations.

3. **Firestore Access Isolation Risks (BOLA)**:
   - **Location**: `src/store/index.ts`
   - **Vulnerability**: Document access paths (e.g. `users/{userId}`) are constructed using client-supplied user UIDs without server-side validation.
   - **Risk**: Front-end state alterations could permit cross-user data read/writes if security rules are missing.
   - **Remediation**: Implement strict Firestore security rules requiring `request.auth.uid == userId`.

4. **Form Input Validation**:
   - **Location**: `src/components/OrganizationSetup.tsx` and `src/components/LoginPage.tsx`
   - **Vulnerability**: Text fields are saved directly to state without constraints or length checks.
   - **Risk**: Layout overflow, malformed data, and storage quota exhaustion.
   - **Remediation**: Add client-side validation pattern and length constraints.

5. **Token and Error Exposure**:
   - **Location**: `src/components/DataImport.tsx`
   - **Vulnerability**: Paste buffers for cURL inputs are shown in plaintext. Error handlers print full `err` objects to `console.error` and UI.
   - **Risk**: Shoulder-surfing and token exfiltration in stack traces/error messages.
   - **Remediation**: Sanitize log messages (log only `err.message`) and clear cURL inputs after parsing.

## Resolved Conflicts
- **Iframe Sandboxing**: Explorer 3 identified that the Canva embed iframe in `src/components/CardRenderer.tsx` does not use the `sandbox` attribute. Explorer 2 did not explicitly flag this.
  - *Resolution*: This is a valid security enhancement. Adding a strict `sandbox` attribute to the Canva iframe is recommended to prevent script execution/redirection outside the Canva environment.

## Dissenting Views
- None. Both explorers are in alignment on the key architectural risks.

## Gaps
- **Dependency CVE Scan**: Neither explorer ran an active `npm audit` to check for packages with CVEs. This must be run during the worker/verification phase.
