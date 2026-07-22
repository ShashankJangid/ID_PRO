# Handoff Report — Security Audit Findings

## 1. Observation
We have inspected the codebase within `src/` and verified the following specific vulnerabilities:
- **Plaintext Configuration**: Hardcoded configuration in `src/lib/firebase.ts` (lines 33-41) containing `apiKey: "AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E"`.
- **Iframe Sandboxing**: Direct rendering of `canvaEmbedUrl` inside `CardRenderer.tsx` (lines 365-378) using a raw `<iframe>` tag without the `sandbox` security attribute.
- **Client-Side Requests**: In `src/components/DataImport.tsx` (lines 169-183, 394-398, 529-533), the codebase executes arbitrary HTTP requests on user-pasted URLs using `fetch()`. The UI features an inline tooltip (line 1138) that instructs developers to start Google Chrome with web security disabled to bypass CORS policies.
- **Data Isolation Rules**: The Zustand store in `src/store/index.ts` synchronizes database data under specific collections `/users/{userId}` (lines 179-211). No database rules or access configurations exist locally in the project repository.
- **Input Validation**: Text inputs in `src/components/OrganizationSetup.tsx` (lines 121-140) and manual record edits in `src/components/DataImport.tsx` (lines 1391-1410, 1911-1928) lack formatting checks, content validation (such as validation of email structure), and text length limitations (`maxLength`).
- **Token exposure in logs**: Raw exceptions are written to console logs using `console.error(err)` in `DataImport.tsx` (lines 453 and 581), which could lead to accidental exposure of credentials contained in request contexts.

---

## 2. Logic Chain
- Hardcoded configurations in `src/lib/firebase.ts` are readable by anyone who accesses the client-side files, meaning security depends entirely on backend validation.
- Since Firestore database settings and files like `firestore.rules` are not present in the repository, Firestore access patterns in `src/store/index.ts` rely completely on the assumption that backend Firestore rules are set up correctly. Without correct security rules, cross-user data read/writes are possible.
- The `canvaEmbedUrl` iframe in `CardRenderer.tsx` allows loading external resources without restriction because it lacks the `sandbox` attribute. This creates a script execution risk.
- Client-side requests in `src/components/DataImport.tsx` to arbitrary URLs could enable scanning of local networks or extraction of sensitive data from local services, especially when combined with tooltips advising users to bypass CORS.
- Lack of format validation and length checks on forms in `OrganizationSetup.tsx` and `DataImport.tsx` allows malformed or exceptionally large inputs to be submitted, which can cause local storage exhaustion or Firestore write failures.
- Printing raw exception objects with `console.error` can leak request headers and API keys in the developer console.

---

## 3. Caveats
- Since this is a client-side read-only audit, we cannot check the active Firestore configuration or deployed Firebase Security Rules in the actual Firebase Console. We assume default settings or potential misconfigurations.
- The CORS proxy configured in `DataImport.tsx` (`https://api.allorigins.win/raw?url=`) is a public service. Its logging, usage limits, and internal security policies are unknown and outside the scope of this repository.

---

## 4. Conclusion
We recommend:
1. Moving all Firebase config properties from `src/lib/firebase.ts` to environment variables (`.env.local`).
2. Whitelisting Canva domains and adding the `sandbox="allow-scripts allow-same-origin allow-popups"` attribute to the iframe in `CardRenderer.tsx`.
3. Validating protocols (`https://`) on cURL parser endpoints and whitelisting permitted domains in `src/components/DataImport.tsx`.
4. Writing and deploying a Firestore security rules schema that maps write permissions strictly to `/users/{userId}` configurations matching the client user's UID.
5. Implementing `maxLength` constraints and basic email/URL type checks on form fields in `OrganizationSetup.tsx`.
6. Changing console errors to print `err.message` instead of the raw error object.

---

## 5. Verification Method
- **Verify Plaintext Configuration**: Run `grep -n "apiKey" src/lib/firebase.ts` to confirm exposure.
- **Verify Iframe Sandboxing**: Open `src/components/CardRenderer.tsx` and confirm line 365 contains no `sandbox` attribute.
- **Verify Client-Side Requests**: Search for `fetch(` calls in `src/components/DataImport.tsx` and inspect the URL variables used in the calls.
- **Verify Input Constraints**: Open `src/components/OrganizationSetup.tsx` and examine input components (such as lines 132-138) to confirm they lack `maxLength` limits.
