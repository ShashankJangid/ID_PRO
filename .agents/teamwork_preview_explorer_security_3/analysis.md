# Security Audit Report: ID Card Studio (ID_PRO)

This document presents the findings of the comprehensive security audit conducted on the ID_PRO codebase. The analysis covers Firebase configuration security, XSS/injection risks, SSRF risks in API data imports, Firestore data access patterns, form input validation, hardcoded credentials, and auth token leakage.

---

## 1. Firebase Configuration Analysis (`src/lib/firebase.ts`)

### Observations
- Plaintext configuration object in `src/lib/firebase.ts`:
  ```typescript
  // Lines 33-41
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

### Risk Assessment & Rules Correlation
1. **Plaintext Storage**: Storing Firebase config in plaintext in client-side web application source files is a common pattern and not inherently a critical secret compromise by itself. This is because any web client downloading the application can inspect network traffic or build chunks to retrieve these values.
2. **Security Rules Dependence**: Because the client keys are public, the actual security boundary is shifted to:
   - **Firebase Security Rules** for Firestore and Cloud Storage.
   - **HTTP Referrer Restrictions** configured on the API Key in the Google Cloud Platform (GCP) Console.
3. **Hardcoding vs Env Vars**: Hardcoding these values directly into the codebase prevents easy environment switching (e.g., development, staging, production) and complicates key rotation.

### Recommendations
- Migrate the Firebase configuration values to environment variables (e.g., `import.meta.env.VITE_FIREBASE_API_KEY`) and load them dynamically.
- In GCP Console, restrict the API key (`AIzaSyBmGQOdp...`) to only accept HTTP referrers from the legitimate app domain(s) (e.g., `https://id-card-login.firebaseapp.com` or local dev URLs under restriction).
- Deploy strict Firebase Security Rules (see Section 4).

---

## 2. XSS & Injection Risks

### Observations
- No usages of `dangerouslySetInnerHTML`, `innerHTML`, or `eval` were detected in the source code. React’s default behavior of escaping text rendering provides robust defense against basic HTML injection in elements.
- **Canva Embed Iframe Vulnerability** in `src/components/CardRenderer.tsx`:
  ```typescript
  // Lines 363-380
  if (canvaEmbedUrl) {
    return (
      <iframe
        src={canvaEmbedUrl}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          zIndex: 0,
          pointerEvents: 'none',
          display: 'block',
        }}
        title="Canva Design"
      />
    );
  }
  ```
  The component renders an `iframe` with the source set to `canvaEmbedUrl`. Since this URL is part of the card template configuration, a compromised or malicious template could contain a non-Canva URL (e.g., pointing to a phishing page, an exploit kit, or a `javascript:` URL scheme). The iframe currently has no sandbox restrictions.

### Recommendations
- Add a `sandbox` attribute to the `iframe` to limit script execution and block access to top-level navigation, forms, and popups:
  ```html
  sandbox="allow-scripts allow-same-origin"
  ```
- Validate `canvaEmbedUrl` using a regex pattern to ensure it matches trusted domains:
  ```typescript
  const isValidCanvaUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && (parsed.hostname === 'www.canva.com' || parsed.hostname === 'canva.com');
    } catch {
      return false;
    }
  };
  ```

---

## 3. API Data Import SSRF & Client-Side Security Risks

### Observations
- The cURL parser in `src/components/DataImport.tsx` extracts a URL and configures a browser-based `fetch` request:
  ```typescript
  // Lines 379-398
  const { url, options } = parseCurl(curlInput);
  ...
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });
  ```
- Image fetch proxy in `src/components/DataImport.tsx`:
  ```typescript
  // Line 182
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  ```

### Risk Analysis
1. **Intranet Request Forgery / Port Scanning**: Since the fetch request runs entirely on the **client side** (in the user's browser), Server-Side Request Forgery (SSRF) targeting backend server environments is not directly applicable. However, this creates a **Client-Side Request Forgery** vector. An attacker could trick a user into importing a cURL command targeting internal intranet URLs (e.g., `http://192.168.1.1` or `http://localhost:8080/admin`). When the user runs the import, their browser will execute requests against these local network resources.
2. **CORS Bypass Instructions**: In `src/components/DataImport.tsx` lines 1137-1139, the application explicitly suggests disabling browser security settings:
   ```text
   💡 Tip: If it's a CORS policy block, use a browser extension like "CORS Unblock" or start Chrome with web security disabled to bypass restrictions during local development.
   ```
   **Critical Security Risk**: Encouraging users to run Chrome with web security disabled (`--disable-web-security`) disables the Same-Origin Policy. If a user does this and navigates to other websites, those sites can read all of the user's private data, local files, and session cookies from any origin.
3. **Data Leakage via Public Image Proxy**: The fallback proxy `https://api.allorigins.win/raw` is a third-party service. Sending sensitive organization or user image URLs through a public proxy leaks data to the proxy operator.

### Recommendations
- **Remove recommendations to disable browser security** from the UI.
- Validate that the URL extracted from cURL is a public web address and not a loopback (`localhost`, `127.0.0.1`), private IP block (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or link-local address (`169.254.169.254`).
- Replace the public CORS image proxy with a self-hosted, secure backend proxy, or enforce that imported images are served with appropriate CORS headers from their origin.

---

## 4. Firestore Data Access Patterns (`src/store/index.ts`)

### Observations
- In `src/store/index.ts`, documents are structured by user UID:
  - User profiles (organization details & card lists): `users/{userId}`
  - Custom templates: `users/{userId}/templates/{templateId}`
- Client-side updates pass `auth.currentUser?.uid` to Firestore functions:
  ```typescript
  // Line 222-225
  const userId = auth.currentUser?.uid;
  if (userId) {
    saveProfileToFirestore(userId, newOrg, state.cardDataList);
  }
  ```

### Risk Analysis
- **Namespace Segregation is not a security boundary**: While the client-side code correctly organizes data under each user's UID, any user could open the browser developer console and use the initialized Firebase instances to perform queries or mutations on arbitrary document paths (e.g. `doc(db, 'users', 'TARGET_USER_UID')`).
- If Firestore Security Rules are not explicitly configured, this represents a significant **Broken Object Level Authorization (B Bola)** risk, allowing users to read, update, or delete other organizations' card lists, templates, and profile settings.

### Recommendations
Ensure the deployed Firestore Security Rules enforce strict path authorization checking matching the authenticated user's ID:
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

## 5. Input Validation Audit

### Observations
- **`src/components/OrganizationSetup.tsx`**:
  - Input fields (name, tagline, phone, email, website, emergencyContact, address) are directly synced to state without validation or sanitation:
    ```typescript
    onChange={(e) => handleChange(field, e.target.value)}
    ```
  - Custom fields (`customFields`) can be defined with duplicate keys or empty keys. Duplicate keys can lead to state collision or object properties overriding each other.
- **`src/components/LoginPage.tsx`**:
  - The phone login page uses a regex checking pattern:
    ```typescript
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+\d{7,15}$/.test(cleaned))
      return setError('Enter phone with country code, e.g. +91 98765 43210');
    ```
  - However, email inputs do not perform client-side structure verification prior to submission, relying primarily on browser-level validation or backend Firebase validation.
- **Data Import**:
  - Uploaded Excel/CSV records (`src/components/DataImport.tsx`) are parsed and merged into Zustand state directly without schema validation or checks for malicious inputs, payload sizes, or field length limits.

### Recommendations
- Implement input format validation (e.g. email, website, phone regex checks) in `OrganizationSetup.tsx` before triggering state updates or save actions.
- Enforce validation in custom fields definitions to prevent empty or duplicate keys:
  ```typescript
  const isValid = customFields.every(f => f.key.trim() !== '') && 
                  new Set(customFields.map(f => f.key.trim())).size === customFields.length;
  ```
- Sanitize and enforce size constraints on uploaded file contents to prevent buffer overflows or memory exhaustion in client browsers during processing.

---

## 6. Credential or Key Exposure

### Observations
- The Firebase configuration key `AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E` is public, which is normal for Firebase client integrations.
- No other secrets, private keys, third-party API tokens, or server credentials were found hardcoded in the codebase.
- No `.env` or configuration template files were found in the workspace root directory.

### Recommendations
- While the Firebase key is public, it should be kept in a `.env.local` configuration file and loaded using Vite's env variables system (`import.meta.env.VITE_FIREBASE_API_KEY`). This avoids having hardcoded project IDs and bucket names in version control, making code promotion cleaner.

---

## 7. Auth Token & Log Leakage

### Observations
- Grep search for `console.` reveals several instances of error printing:
  - `src/components/DataImport.tsx`:
    ```typescript
    // Line 453 & 581
    } catch (err: any) {
      console.error(err);
      ...
    ```
    During API imports using pasted cURL commands, `err` could hold a failed `Response` or `Request` object. If the request was constructed using pasted auth tokens (such as bearer tokens, session keys, or API credentials), printing the raw error or request object directly to the console will expose these credentials to browser inspection.
  - `src/store/index.ts`:
    - `console.error('Error saving template to Firestore:', e);`
    - `console.error('Error deleting template from Firestore:', e);`
    - `console.error('Error saving profile to Firestore:', e);`
    - `console.error('Error syncing store with Firestore:', e);`
    Firebase client SDK error objects can contain metadata including project context, database paths, and authenticated session tokens.

### Recommendations
- Replace standard `console.error(err)` logging with structured logging or extract only `err.message` or `err.code` for logging:
  ```typescript
  console.error('API Fetch failed:', err.message || err.code || 'Unknown Error');
  ```
- Implement a global logging utility that strips headers (especially `Authorization` or custom token headers) and filters out Firebase error payload properties containing tokens.
