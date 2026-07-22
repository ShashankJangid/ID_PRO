# Handoff Report: Security Explorer 3 (Milestone: Security)

## 1. Observation
The security audit of the ID_PRO application was conducted on the files in `src/`. The following findings were identified:

1. **Hardcoded Firebase Configuration**:
   - Location: `src/lib/firebase.ts` lines 33-41
   - Verbatim:
     ```typescript
     const firebaseConfig = {
       apiKey: "AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E",
       authDomain: "id-card-login.firebaseapp.com",
       projectId: "id-card-login",
       storageBucket: "id-card-login.firebasestorage.app",
       messagingSenderId: "196978536104",
       appId: "1:196978536104:web:a14cb81df8218191c31c9d",
       measurementId: "G-DL9NVBTLX9"
     };
     ```

2. **Iframe Rendering without Sandbox/Verification**:
   - Location: `src/components/CardRenderer.tsx` lines 363-380
   - Verbatim:
     ```typescript
     if (canvaEmbedUrl) {
       return (
         <iframe
           src={canvaEmbedUrl}
           style={{ ... }}
           title="Canva Design"
         />
       );
     }
     ```

3. **Client-Side Fetch & CORS Bypass Recommendation**:
   - Location: `src/components/DataImport.tsx` lines 379-398 and lines 1137-1139
   - Verbatim:
     ```typescript
     const { url, options } = parseCurl(curlInput);
     ...
     const response = await fetch(url, { ... });
     ```
     ```text
     💡 Tip: If it's a CORS policy block, use a browser extension like "CORS Unblock" or start Chrome with web security disabled to bypass restrictions during local development.
     ```

4. **Firestore Segregation without Server-Side Verification**:
   - Location: `src/store/index.ts` lines 222-225 and lines 440-446
   - Verbatim:
     ```typescript
     const userId = auth.currentUser?.uid;
     if (userId) {
       saveProfileToFirestore(userId, newOrg, state.cardDataList);
     }
     ```
     No local file contains security rules definitions (e.g. `firestore.rules`).

5. **Lack of Form Input validation**:
   - Location: `src/components/OrganizationSetup.tsx` lines 120-142
   - Verbatim: All text fields are read into state without validation or syntax verification using `<input type="text" onChange={(e) => handleChange(field, e.target.value)} />`.

6. **Log Leakage Risk**:
   - Location: `src/components/DataImport.tsx` line 453 & line 581
   - Verbatim: `console.error(err);` in catches for cURL API fetches.

---

## 2. Logic Chain
1. **Firebase Public Key Risk**: Since client-facing configuration keys (`apiKey`) are hardcoded in plaintext inside `src/lib/firebase.ts`, a malicious user can instantiate the Firebase client inside their own scripts. If backend authorization rules are absent, this grants the user direct database write access.
2. **Iframe Vulnerability**: The `CardRenderer.tsx` component embeds `canvaEmbedUrl` inside an iframe without a `sandbox` attribute or domain validation. A malicious user with custom template capabilities could inject an iframe pointing to an arbitrary domain or script, enabling Phishing, Open Redirect, and Clickjacking.
3. **SSRF / Intranet Request Forgery / Security Settings Degradation**: The `parseCurl` function in `DataImport.tsx` triggers `fetch(url)` in the client browser. Paste-in commands can target intranet endpoints (e.g., `http://192.168.1.1`). Furthermore, the interface explicitly instructs developers/users to disable local web security policies (`--disable-web-security`), which exposes users to severe cross-origin exploits.
4. **BOLA in Firestore**: The Zustand store reads/writes to `users/{userId}` using client-side UID parsing. Because Firebase client integrations are run by client code, namespace separation does not prevent users from querying other UIDs using console scripts unless Firestore Security Rules are deployed.
5. **Form Validation Bypass**: The lack of checking in `OrganizationSetup.tsx` inputs allows invalid/empty organization configurations, empty custom fields, or duplicate mapping keys to be sent and stored, which can corrupt the data model.
6. **Token Leakage via logs**: Printing the complete `err` object to the console during API import failures might display the request configuration (including `Authorization` headers) in console traces.

---

## 3. Caveats
- Firebase Console configuration and GCP Console settings (such as API Key Referrer Restrictions or Firestore Security Rules deployed live) are not visible from the local codebase. We assume no rules exist because no local `firestore.rules` files are tracked in the version control repository.

---

## 4. Conclusion
The security posture of the ID_PRO application has key vulnerabilities in input parsing, iframe embedding, and potential data isolation leaks.
The critical findings are:
1. Client-Side Request Forgery vulnerability and high-risk instructions to disable browser security in `DataImport.tsx`.
2. Iframe Injection vulnerability in `CardRenderer.tsx` due to rendering unchecked template URLs.
3. Broken Object Level Authorization (BOLA) risk if Firestore Security Rules are not deployed.

Detailed recommendations and remediation strategies have been documented in `analysis.md` in the working directory.

---

## 5. Verification Method
1. Inspect the source file locations highlighted in `analysis.md` to confirm the presence of unvalidated iframe elements (`CardRenderer.tsx`), unsafe cURL client fetches and UI suggestions (`DataImport.tsx`), and plaintext keys (`src/lib/firebase.ts`).
2. Verify that there is no `firestore.rules` or `storage.rules` in the repository, representing a key risk factor for database access.
3. Try pasting a cURL command into `DataImport.tsx` with a header URL (e.g., `Referer: https://example.com`) placed before the target URL and verify that the parser incorrectly extracts `https://example.com` as the destination.
