## 2026-07-07T14:17:22Z
<USER_REQUEST>
You are teamwork_preview_worker.
Your working directory is: /Users/0xshashank/Downloads/app/.agents/teamwork_preview_worker_security_2/
Your identity: Security Worker 2
Milestone: security
Iteration: 2
Project Scope Document: /Users/0xshashank/Downloads/app/.agents/orchestrator/PROJECT.md
Reviewer 1 Handoff: /Users/0xshashank/Downloads/app/.agents/teamwork_preview_reviewer_security_1/handoff.md
Challenger 1 Handoff: /Users/0xshashank/Downloads/app/.agents/teamwork_preview_challenger_security_1/handoff.md

Task:
Perform Iteration 2 security fixes in the codebase to remediate the edge cases and bypasses identified during verification:

1. ReDoS (Regular Expression Denial of Service) in Website Regex:
   - In `src/components/OrganizationSetup.tsx`, locate the website URL regex (around line 122). Replace it with a safer pattern that does not suffer from exponential backtracking (remove nested star quantifiers or use a standard URL matching regex like `/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/i` where the space is removed and quantifier is safe, or simplify the check).
2. Hardened SSRF/URL validation in cURL fetch:
   - In `src/components/DataImport.tsx` in `validateTargetUrl`:
     - Block the entire `127.0.0.0/8` range for loopbacks (e.g. `hostname === '127.0.0.1'` or matching `127.*`).
     - Block the entire RFC 1918 Class B range `172.16.0.0/12` (from `172.16.0.0` to `172.31.255.255`). You can check this with regex: `/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)`.
     - Block `0.0.0.0` and `[::]`.
     - Ensure empty hostnames or invalid formats are correctly caught.
3. Secure cURL Token Clearance:
   - In `src/components/DataImport.tsx`, ensure `setCurlInput('')` is called not only when starting/parsing the input, but also if an exception is thrown in the validation check or if the user cancels the confirmation dialog. The input must ALWAYS be cleared to prevent sensitive API tokens from being left on-screen in plaintext.
4. Input Limits in Custom Fields & Image Collections:
   - Locate custom field inputs in `src/components/OrganizationSetup.tsx` (e.g. key, label, value) and verify they have `maxLength` attributes (e.g., `maxLength={100}`).
   - Locate image collection labels/names inputs in `src/components/shared/ImageCollectionSection.tsx` (or whatever components handle custom asset labels/keys) and add `maxLength` limits (e.g., `maxLength={100}`).
5. SSRF validation in CSV Image URLs:
   - In `src/components/DataImport.tsx` inside `imageUrlToBase64` (lines 179-196), run the URL through protocol validation and local range checks (e.g. call `validateTargetUrl` or a similar validation) to prevent the browser from attempting to download local/intranet resources via CSV image URLs.

Verification:
- Ensure no TypeScript compile errors by compiling or inspecting syntax.
- Document all modifications in `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

</USER_REQUEST>
