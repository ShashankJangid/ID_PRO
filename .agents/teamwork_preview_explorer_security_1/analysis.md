# ID_PRO Codebase Security Audit Report

**Audit Conducted by**: Security Explorer 1  
**Milestone**: Security  
**Target Directory**: `src/`  
**Date**: 2026-07-07  

---

## Executive Summary
This report presents a security audit of the ID_PRO codebase. The codebase was analyzed across seven specific areas of concern including authentication, API integration, data input handling, and database query patterns.

Key findings include:
1. Hardcoded plaintext Firebase configurations that require backend validation via Cloud Security Rules.
2. Form inputs lacking length and format validation, posing a risk of database bloat or malformed inputs.
3. Imprecise iframe embedding of third-party templates (Canva URLs) without iframe sandboxing.
4. Client-side HTTP requests targeting arbitrary user-supplied URLs, which can pose local network scanning risks if browser CORS checks are disabled.
5. Insecure console logs that print raw error objects.

---

## Detailed Audit Findings

### 1. Firebase Configuration in Plaintext
- **Target File**: `src/lib/firebase.ts` (Lines 33-41)
- **Code Block**:
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
- **Vulnerability Analysis**:
  In Firebase applications, client-side configuration parameters are technically public. Storing them in plaintext in client code is standard, but keeping them hardcoded in version control poses operational and security concerns:
  - **Project Abuse / Quota Exhaustion**: Attackers can copy the config and write automated scripts to register users, spam authentication endpoints, or consume database quotas, incurring charges.
  - **No Environment Separation**: Hardcoded values make it difficult to rotate keys or run different environments (development vs production).
- **Risk Level**: Medium
- **Recommended Fix**:
  1. Migrate config parameters to environment variables. Create a `.env.local` file (not committed to Git) and access variables via Vite's `import.meta.env`:
     ```typescript
     const firebaseConfig = {
       apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
       authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
       projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
       storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
       messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
       appId: import.meta.env.VITE_FIREBASE_APP_ID,
       measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
     };
     ```
  2. Implement strict client limits and domain whitelisting inside the Firebase console (Authentication > Settings > Authorized Domains).

---

### 2. XSS / HTML Injection Risks
- **Target Files**: `src/components/CardRenderer.tsx` (Lines 365-378), `src/components/DataImport.tsx` (Lines 22-75)
- **Vulnerability Analysis**:
  - **Canva Iframe Embedding**: In `CardRenderer.tsx`, templates can define a `canvaEmbedUrl` which is rendered directly in an iframe:
    ```typescript
    <iframe
      src={canvaEmbedUrl}
      style={{ ... }}
      title="Canva Design"
    />
    ```
    If an attacker uploads or modifies a template to contain a malicious `canvaEmbedUrl` (e.g. a phishing page or a page executing scripts), it is loaded inside the user's browser context. The iframe also lacks a `sandbox` attribute, allowing it full script execution and popup capability.
  - **JSX Text Escaping**: Dynamic text rendered inside `{displayText}` in `CardRenderer.tsx` (Line 210) is safe from HTML element injection because React automatically escapes strings inside JSX curly brackets.
  - **cURL Parsing (`parseCurl`)**: The `parseCurl` parser in `DataImport.tsx` does not execute commands in a system shell. It only parses strings using regexes and triggers requests via JavaScript's `fetch`. However, the regexes are naive and do not sanitize inputs, which may lead to malformed parameters or URLs.
- **Risk Level**: Medium
- **Recommended Fix**:
  1. Add a `sandbox` attribute to the iframe in `CardRenderer.tsx` to restrict permissions:
     ```typescript
     <iframe
       src={canvaEmbedUrl}
       sandbox="allow-scripts allow-same-origin allow-popups"
       ...
     />
     ```
  2. Validate that `canvaEmbedUrl` matches a trusted domain regex (e.g. `^https://(www\.)?canva\.com/`) before rendering.

---

### 3. Client-Side HTTP Fetch / SSRF Risks
- **Target File**: `src/components/DataImport.tsx` (Lines 169-183, 394-398, 529-533)
- **Vulnerability Analysis**:
  The application fetches user-supplied URLs via `fetch` during data imports (ERP API curl import and Image to Base64 conversion).
  - **Client-Side Request Forgery**: Because this is a Single Page Application (SPA) running in the browser, traditional Server-Side Request Forgery (SSRF) does not directly apply (the server is not fetching it). However, it allows **client-side arbitrary HTTP requests**.
  - **Internal Network Scanning**: An attacker could trick a user into pasting a cURL command targeting internal company servers (e.g., `http://localhost:8080`, `http://192.168.1.1`). If the user disables browser security (as explicitly recommended in the tooltip on Line 1138: *"start Chrome with web security disabled"*), the browser bypasses CORS, allowing the app to read sensitive internal intranet data and save/sync it to Firestore.
  - **Data Leakage via CORS Proxy**: In `imageUrlToBase64`, if a direct fetch fails, the URL is automatically sent to the third-party proxy `https://api.allorigins.win/raw?url=...` (Line 182). This leaks internal/sensitive URLs (and potentially query parameters/tokens) to a third-party service.
- **Risk Level**: Medium
- **Recommended Fix**:
  1. Validate that the URL uses only safe protocols (`http:`, `https:`) and matches a whitelist of public domains.
  2. Remove the developer tooltip advising users to start browsers with disabled web security.
  3. Instead of using a public third-party CORS proxy, implement a secure self-hosted backend proxy that strictly whitelists target endpoints.

---

### 4. Firestore Data Access Patterns & Cross-User Risks
- **Target File**: `src/store/index.ts` (Lines 179-211, 440-529)
- **Vulnerability Analysis**:
  Data operations (saving, deleting, syncing templates and profile settings) query documents using `auth.currentUser?.uid` (e.g. `doc(db, 'users', userId)`). 
  While the client-side code correctly segments data per user, **Firestore security depends entirely on backend Security Rules**. No Security Rules configuration files (e.g. `firestore.rules`) are checked into this repository. If the backend Firestore database has permissive rules (such as `allow read, write: if request.auth != null;` or `allow read, write: if true;`), any user can read/write other users' templates and profiles simply by crafting custom queries in the browser console.
- **Risk Level**: High
- **Recommended Fix**:
  Create and deploy a `firestore.rules` file that strictly restricts access to a user's own data path based on their authenticated UID:
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

---

### 5. Input Validation Gaps in Forms
- **Target Files**: `src/components/OrganizationSetup.tsx` (Lines 121-140), `src/components/DataImport.tsx` (Lines 1391-1410, 1911-1928)
- **Vulnerability Analysis**:
  - **No Length Controls**: Input forms for organization setups, manual card entries, and edits use generic `<input type="text" />` without `maxLength` restrictions. Users can paste extremely large blocks of text, leading to local database corruption (exceeding IndexedDB quotas) or Firestore document size limit errors (max 1MB).
  - **No Format Verification**: Organization fields (Phone, Email, Website) and Card Data fields (Date of Birth, Contact) are not validated on the client side:
    - The Email and Website fields use `type="text"` instead of `type="email"` or `type="url"`.
    - No checks ensure email format contains `@` or phone format contains valid digits.
- **Risk Level**: Low-Medium
- **Recommended Fix**:
  1. Enforce length limitations on input elements:
     ```typescript
     <input type="text" maxLength={100} ... />
     ```
  2. Use semantic input types (`type="email"`, `type="url"`, `type="tel"`) to leverage browser-native validation.
  3. Validate date inputs (e.g. Date of Birth, Issued Date) using date pickers or regular expressions before updates are committed.

---

### 6. Credential or Key Exposure
- **Target File**: `src/lib/firebase.ts` (Line 34)
- **Vulnerability Analysis**:
  - The Firebase API key `AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E` is committed directly to the codebase in plaintext.
  - A search of the codebase did not reveal other secrets, passwords, or tokens.
- **Risk Level**: Medium
- **Recommended Fix**:
  Rotate the Firebase API key and move it to environment variables as described in Finding #1.

---

### 7. Auth Token and Error Exposure
- **Target Files**: `src/components/LoginPage.tsx` (Lines 278-290), `src/components/DataImport.tsx` (Lines 453, 581)
- **Vulnerability Analysis**:
  - **LoginPage**: Handles authentication errors correctly. It parses Firebase error codes using a `friendlyFirebaseError` dictionary and displays mapped error text (e.g. *"Incorrect password. Please try again."*) instead of raw exception details.
  - **DataImport**: In `handleFetchERP` and `handleBothFetchERP`, caught exceptions from fetch calls are logged directly via `console.error(err)`. If the error object or custom request headers contain sensitive tokens (e.g. pasted Authorization headers), they could be exposed in the browser's console logs.
- **Risk Level**: Low
- **Recommended Fix**:
  Avoid logging raw exception objects that contain request metadata. Log only the error message or a generic error code:
  ```typescript
  console.error('API Fetch failed:', err.message || err);
  ```
