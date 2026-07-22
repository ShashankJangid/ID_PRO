# Security Audit Report — ID_PRO (ID Card Studio)

This report documents the security audit findings for the ID_PRO application based on the codebase located in `src/`. The audit focused on Firebase configuration, XSS and injection risks, client-side SSRF risks, Firestore data access patterns, input validation, secret exposure, and auth token leakage.

---

## Executive Summary
The ID_PRO application is a client-side single-page application (SPA) built with React, Vite, Tailwind CSS, and Firebase. 
While React's default rendering patterns prevent basic client-side XSS injection, several security vulnerabilities and architectural risks were identified:
1. **Plaintext Firebase Configuration**: Hardcoded client-side credentials in `src/lib/firebase.ts`.
2. **Untrusted Third-Party CORS Proxy**: The use of `allorigins.win` in `src/components/DataImport.tsx` leak sensitive user-supplied image URLs.
3. **Insecure CORS Bypass Recommendations**: Developer tips suggesting users disable browser security policies or use CORS unblocking extensions.
4. **Client-Controlled Firestore Access Paths**: Dependency on the client-side `userId` parameter for Firestore document paths, which requires robust backend Security Rules.
5. **Lack of Input Validation**: Forms in `OrganizationSetup.tsx` lack input validation or string length limits, risking UI issues and storage quota exhaustion.
6. **Token Exposure in Logs & UI**: Component state displays raw cURL commands (with tokens) in plaintext, and raw errors are printed to console logs and UI.

---

## Detailed Findings

### Finding 1: Plaintext Firebase Configuration
* **File Path**: `src/lib/firebase.ts` (Lines 33–41)
* **Vulnerability Type**: Insecure Credential Storage / Environment Configuration
* **Description**: The Firebase config block contains the Firebase Web App credentials (API Key, Project ID, App ID, etc.) hardcoded in plaintext:
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
* **Security Risk**: While Firebase client-side keys are designed to be public, hardcoding them directly in the repository makes it difficult to separate environments (e.g., development, staging, production) and exposes the project identifiers in Git history.
* **Relationship to Security Rules**: Since anyone visiting the application can extract these credentials and access the Firebase services directly, the database relies **entirely** on Firestore Security Rules configured in the Firebase Console. Without rules enforcing `request.auth.uid == userId`, anyone can read or modify the entire database.

---

### Finding 2: Insecure Third-Party CORS Proxy for Image Downloads
* **File Path**: `src/components/DataImport.tsx` (Lines 181–196)
* **Vulnerability Type**: Sensitive Data Exposure / Third-Party Dependency Risk
* **Description**: In `imageUrlToBase64`, if a direct image fetch fails due to browser CORS policies, the app routes the image request through a public, untrusted CORS proxy:
  ```typescript
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  const res = await fetch(proxyUrl);
  ```
* **Security Risk**: Passing arbitrary user-supplied image URLs (which may contain sensitive employee photos) to `allorigins.win` exposes this data to a third-party service. This service can log, inspect, or intercept the requests, violating user privacy and corporate data security policies. 

---

### Finding 3: Insecure CORS Bypass Recommendations
* **File Path**: `src/components/DataImport.tsx` (Lines 1137–1139)
* **Vulnerability Type**: Security Misconfiguration / Bad Developer Advice
* **Description**: The error message template in `DataImport.tsx` suggests that users download CORS unblocking browser extensions or disable web security in Chrome to bypass CORS blocks:
  ```typescript
  💡 Tip: If it's a CORS policy block, use a browser extension like "CORS Unblock" or start Chrome with web security disabled to bypass restrictions during local development.
  ```
* **Security Risk**: Disabling Chrome's web security flags (`--disable-web-security`) disables the Same-Origin Policy (SOP). If a user does this, they become highly vulnerable to Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) across all open browser tabs, putting sensitive credentials at risk.

---

### Finding 4: Client-Controlled Firestore Access Paths
* **File Path**: `src/store/index.ts` (Lines 179–211, 440–529)
* **Vulnerability Type**: Broken Object-Level Authorization (BOLA) Risk
* **Description**: All Firestore data operations rely on the `userId` parameter passed from the client-side state:
  ```typescript
  const saveTemplateToFirestore = async (userId: string, template: CardTemplate) => {
    const docRef = doc(db, 'users', userId, 'templates', template.id);
    await setDoc(docRef, { ... });
  };
  ```
* **Security Risk**: If an attacker intercepts the Javascript execution or calls these methods directly from the browser console, they can pass an arbitrary `userId` to write or read another user's templates or profile.
* **Remediation Requirement**: Access control *must* be enforced at the Firebase backend level using Firestore Security Rules. The frontend cannot be trusted to self-scope requests.

---

### Finding 5: Lack of Input Validation and Sanitization
* **File Paths**: 
  * `src/components/OrganizationSetup.tsx` (Lines 120–142, 281–311)
  * `src/components/LoginPage.tsx` (Lines 538–598)
* **Vulnerability Type**: Lack of Input Validation
* **Description**:
  * In `OrganizationSetup.tsx`, fields like name, tagline, email, website, phone, and custom field keys/values are saved directly to state without pattern validation (e.g., verifying email formats or URL structures) or length limits.
  * In `LoginPage.tsx`, the email input depends on Firebase Auth backend validation. The password only has a basic check for length `< 6`.
* **Security Risk**:
  * Users can enter malformed data (invalid URLs or emails).
  * Entering very long strings can cause UI rendering issues (layout overflow) and can exceed LocalStorage/IndexedDB storage quotas.

---

### Finding 6: Shoulder Surfing & Token Leakage in Console/UI
* **File Paths**:
  * `src/components/DataImport.tsx` (Lines 308, 1120–1132, 1185–1195)
  * `src/components/DataImport.tsx` (Lines 453, 581)
* **Vulnerability Type**: Sensitive Data Exposure in Logs and UI
* **Description**:
  * The past cURL input textarea displays pasted commands in plaintext.Paste operations frequently contain raw authentication tokens (e.g. `Authorization: Bearer <TOKEN>`), making them visible to anyone looking at the screen.
  * When cURL API fetches fail, the raw error `err` is logged to the console using `console.error(err)` and displayed in the UI:
    ```typescript
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An error occurred while fetching data.');
    }
    ```
* **Security Risk**:
  * Plaintext display of cURL inputs creates a shoulder-surfing risk.
  * Direct logging of the `err` object or displaying `err.message` in the UI can leak sensitive tokens, cookies, or internal API structures if the error object contains request details.

---

## Recommended Remediation Steps

### 1. Move Firebase Config to Environment Variables
Instead of hardcoding config variables, use Vite's built-in support for environment variables:
* Create a `.env.example` file documenting the required environment variables:
  ```env
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_STORAGE_BUCKET=
  VITE_FIREBASE_MESSAGING_SENDER_ID=
  VITE_FIREBASE_APP_ID=
  VITE_FIREBASE_MEASUREMENT_ID=
  ```
* Modify `src/lib/firebase.ts` to use `import.meta.env`:
  ```typescript
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  ```

### 2. Implement Strict Firestore Security Rules
Ensure the Firestore instance has rules deployed that restrict document access by user ID:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /templates/{templateId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 3. Replace Public CORS Proxy with Secure Self-Hosted Proxy
* Remove references to `https://api.allorigins.win/raw?url=`.
* Implement a serverless function (e.g., Vercel / Netlify / Firebase Cloud Function) that acts as a secure image proxy. This proxy can validate the source domain and fetch the image safely without leaking data to third parties.
* Alternatively, encourage users to host their assets with proper CORS headers (`Access-Control-Allow-Origin: *`).

### 4. Remove Insecure Browser Recommendations
* Remove the text recommending users to disable Chrome web security or use CORS unblocking extensions.
* Provide clean, secure documentation on how to configure CORS on their ERP API gateways.

### 5. Validate and Sanitize Form Inputs
* Add client-side validation to `OrganizationSetup.tsx` using HTML5 constraints or a library like `zod` for parsing.
* Enforce maximum length limits on fields (e.g., max 100 characters for names, 20 characters for phone numbers) and format checking for emails and websites.

### 6. Secure Token and Error Logging
* Sanitize errors before logging. Instead of logging the raw error object, log custom error strings or explicitly omit request headers/tokens:
  ```typescript
  console.error('API Fetch failed:', err.message || 'Unknown network error');
  ```
* Clear the cURL input field immediately after the import completes or offer a button to mask/hide headers.
