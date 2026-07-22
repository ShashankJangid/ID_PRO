# Codebase Functional Bug Hunt Analysis

This report documents the findings and proposed fix strategies for the functional bug hunt across the codebase in `src/`.

---

## 1. Memory Leak in `src/App.tsx` (Favicon Generation)

### Observation
In `src/App.tsx` (lines 86-179), the `generateFavicon` function is called on every change of `themeColor` or `themeGradientColor` (which can happen frequently during configuration):
```typescript
    const generateFavicon = (primary: string, gradient: string) => {
      const svgContent = `...`.trim();

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
      }
      link.href = url;
    };
```
Every time the theme changes, a new Blob is created and a new object URL is allocated via `URL.createObjectURL(blob)`. The previous object URL is never revoked, causing a progressive memory leak in the browser session.

### Fix Strategy
Before assigning `link.href = url`, check if the existing `link.href` is a Blob URL (starts with `blob:`) and revoke it to free up browser memory:
```typescript
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        if (link.href && link.href.startsWith('blob:')) {
          URL.revokeObjectURL(link.href);
        }
      } else {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
      }
      link.href = url;
```

---

## 2. UI Blocking Delay on Login in `src/App.tsx`

### Observation
In `src/App.tsx` (lines 192-195), an artificial 1200ms `setTimeout` delay is introduced during authentication:
```typescript
      if (u) {
        await switchStoreUser(u.uid);
        const isLoggingIn = sessionStorage.getItem('logging_in') === 'true';
        if (isLoggingIn) {
          sessionStorage.removeItem('logging_in');
          setTimeout(() => {
            setUser(u);
            setAuthLoading(false);
          }, 1200);
        } else {
          setUser(u);
          setAuthLoading(false);
        }
      }
```
This delay forces a 1200ms wait before showing the dashboard when `sessionStorage.getItem('logging_in')` is `'true'`. It matches the 1200ms delay in `src/components/LoginPage.tsx` (lines 155, 174, 229, 277) where the login form waits for the success animation to play before calling `onLogin()`. 
If both files have delays, or if the user wants instant transitions, this artificial delay degrades the user experience.

### Fix Strategy
To remove the blocking delay, update the authentication state change handler in `src/App.tsx` to set the user state immediately:
```typescript
      if (u) {
        await switchStoreUser(u.uid);
        if (sessionStorage.getItem('logging_in') === 'true') {
          sessionStorage.removeItem('logging_in');
        }
        setUser(u);
        setAuthLoading(false);
      }
```
Also, clean up the corresponding `setTimeout` wrappers around `onLogin()` in `src/components/LoginPage.tsx` so that logins transition instantly.

---

## 3. Firestore Sync in Zustand Store (`src/store/index.ts`)

### Observation
In `src/store/index.ts`, database write operations are triggered synchronously inside the Zustand state mutators:
- `updateOrganization` calls `saveProfileToFirestore(userId, newOrg, state.cardDataList)`
- `addTemplate` calls `saveTemplateToFirestore(userId, fitted)`
- `updateTemplate` calls `saveTemplateToFirestore(userId, updated)`
- `deleteTemplate` calls `deleteTemplateFromFirestore(userId, id)`
- `setCardDataList` / `addCardData` / `updateActiveCard` call `saveProfileToFirestore(userId, state.organization, ...)`

Since elements can be resized or dragged continuously in the designer (triggering `updateTemplate` on every mouse movement), or since the organization forms trigger updates on every keystroke, these synchronous, non-debounced Firestore writes will quickly exhaust Firebase API quotas and cause significant UI lag.

### Fix Strategy
Implement a key-based debounce utility in `src/store/index.ts` to limit the rate of database writes.

1. **Debounce Utility**:
   ```typescript
   function debounceByKey<T extends (...args: any[]) => any>(
     fn: T,
     delay: number,
     getKey: (...args: Parameters<T>) => string
   ) {
     const timers: Record<string, ReturnType<typeof setTimeout>> = {};
     return (...args: Parameters<T>) => {
       const key = getKey(...args);
       if (timers[key]) clearTimeout(timers[key]);
       timers[key] = setTimeout(() => {
         delete timers[key];
         fn(...args);
       }, delay);
     };
   }
   ```

2. **Debounced Operations**:
   Define debounced wrappers that query the *latest* Zustand store state at execution time rather than closure snapshots:
   ```typescript
   const debouncedSaveProfile = debounceByKey(
     async (userId: string) => {
       const state = useAppStore.getState();
       await saveProfileToFirestore(userId, state.organization, state.cardDataList);
     },
     1000,
     (userId) => userId
   );

   const debouncedSaveTemplate = debounceByKey(
     async (userId: string, templateId: string) => {
       const state = useAppStore.getState();
       const template = state.templates.find((t) => t.id === templateId);
       if (template) {
         await saveTemplateToFirestore(userId, template);
       }
     },
     1000,
     (userId, templateId) => `${userId}-${templateId}`
   );
   ```

3. **Call Debounced Functions inside Zustand Reducers**:
   Replace synchronous calls with `debouncedSaveProfile(userId)` and `debouncedSaveTemplate(userId, templateId)`. Note that `deleteTemplateFromFirestore` can remain immediate as template deletion is a low-frequency, discrete action.

---

## 4. Default Placeholder Address in Zustand Store

### Observation
In `src/store/index.ts` (lines 75-80), the default card placeholder data is:
```typescript
const defaultCardData: CardData = {
  name: 'Sample Name', role: 'Designation', code: 'DEMO-001',
  dob: '01-01-2000', blood: 'A+', contact: '+91-XXXXXXXXXX',
  address: 'School Address, City', issued: '01-06-2025',
  valid: '31-05-2026', emergency: '+91-XXXXXXXXXX',
};
```
The address field (line 78) is still `'School Address, City'`.

### Fix Strategy
Update line 78 in `src/store/index.ts` to the desired default address representation.

---

## 5. Image Fetch CORS in `src/components/DataImport.tsx`

### Observation
In `src/components/DataImport.tsx`, `imageUrlToBase64` makes a direct `fetch(url)` to retrieve the image and convert it into a base64 Data URL:
```typescript
export async function imageUrlToBase64(url: string): Promise<string> {
  validateTargetUrl(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    ...
  }
}
```
If the image host does not supply CORS headers (`Access-Control-Allow-Origin: *`), the `fetch(url)` call fails due to a browser CORS violation.
In `confirmImport` (lines 961-975), the catch block discards the image entirely:
```typescript
            try {
              const b64 = await imageUrlToBase64(normalisePhotoUrl(card.photo));
              return { ...card, photo: b64 };
            } catch {
              // Photo download failed — keep card but clear the broken URL
              return { ...card, photo: undefined };
            }
```
This causes the user's photo to be cleared and lost if the origin lacks CORS headers, even though the image could still be rendered in the browser UI using a standard `<img>` tag without CORS.

### Fix Strategy
Modify the catch block in `confirmImport` to retain the original photo URL as a fallback, rather than clearing it to `undefined`:
```typescript
            try {
              const b64 = await imageUrlToBase64(normalisePhotoUrl(card.photo));
              return { ...card, photo: b64 };
            } catch {
              // Fallback: retain original URL so the browser can attempt to render it via img src
              return { ...card, photo: normalisePhotoUrl(card.photo) };
            }
```
Note: If CORS is missing, drawing the card to canvas during export (e.g. `html2canvas` in `PreviewExport`) will result in a tainted canvas or a missing image. However, retaining the URL is still better than silent deletion.

---

## 6. Memory Leak Investigation in `src/components/PreviewExport.tsx`

### Observation
- **Print Preview Blobs**: In `exportSingle` and `exportAll` under the `'print'` format, the PDF is exported as a Blob and a Blob URL is generated:
  ```typescript
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  ```
  The URL is revoked after a 60-second timeout. While this eventually cleans up the memory, if the user triggers many print previews in quick succession, multiple large Blobs will reside in memory simultaneously. If the tab or app is closed before the timeout fires, it relies on browser garbage collection.
- **Iframe Document Capture**: In `captureCard`, an off-screen `iframe` is appended, written to via `iframeDoc.write()`, rendered with React, and then removed:
  ```typescript
  } finally {
    if (root) root.unmount();
    iframe.remove();
  }
  ```
  The iframe is correctly unmounted and removed from the DOM in the `finally` block. It does not use a Blob URL (`src="blob:..."`), so no Blob URL leaks exist here.
- **Preloaded Images**: In `preloadStaticAssets`, images are preloaded using `new Image()`, setting `crossOrigin = 'anonymous'`, and caching them in a local `Map`. These images do not use Blob URLs and are garbage collected when the cache goes out of scope.

### Fix Strategy
The print preview cleanup is acceptable because revoking it immediately would prevent the new tab from loading the PDF. However, we can reduce the timeout to 30 seconds or implement a global array to track open preview URLs and revoke them when the component unmounts.

---

## 7. Additional Functional Bugs Found

### A. Rotated Selection Overlay in `src/components/designer/DesignerCanvas.tsx`
* **Bug**: In `DesignerCanvas.tsx` (lines 96-157), the selection overlay `div` that sits on top of the elements to handle selection, dragging, and resizing does **not** apply the element's rotation angle style.
* **Impact**: If an element is rotated (e.g., 45 degrees), its selection bounding box and resize handles remain upright and unrotated, which doesn't align with the rotated element.
* **Fix**: Apply the rotation style to the selection overlay container:
  ```typescript
  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  ```

### B. Rotated Resizing Calculations in `src/hooks/useDragResize.ts`
* **Bug**: In `useDragResize.ts` (lines 100-101), the resize handles calculate width and height updates based on direct `clientX`/`clientY` offsets (`dx` and `dy`).
* **Impact**: If an element is rotated, the resizing action is mapped incorrectly (e.g. dragging the right handle of a 90-degree rotated element horizontally will change its height instead of width, or trigger visual jumping).
* **Fix**: Resizing a rotated element requires transforming the delta mouse movements `(dx, dy)` into the local coordinate system of the rotated element:
  ```typescript
  const rad = (el.rotation || 0) * Math.PI / 180;
  const localDx = dx * Math.cos(rad) + dy * Math.sin(rad);
  const localDy = -dx * Math.sin(rad) + dy * Math.cos(rad);
  ```
  Use `localDx` and `localDy` instead of `dx` and `dy` when recalculating dimensions.

### C. Editable Custom Field Keys in `src/components/OrganizationSetup.tsx`
* **Bug**: In `OrganizationSetup.tsx` (lines 347-379), users can freely edit the key name of custom fields (e.g. changing `custom1` to `myField`).
* **Impact**: If a card template references the old key (`custom1`), modifying it will break the template rendering since that key no longer exists on the organization custom fields.
* **Fix**: Make custom field keys read-only once created, allowing only their label to be edited, or perform a cascade update to search and replace key references across all saved templates.

### D. Key Index Anti-pattern in `src/components/OrganizationSetup.tsx`
* **Bug**: The custom fields list rendering maps fields using the array index `idx` as the React `key` prop.
* **Impact**: When adding or removing custom fields from the list, inputs can lose focus or retain old values incorrectly because React cannot track DOM identity.
* **Fix**: Generate a unique, stable ID for each custom field (e.g. `field.id` or `Date.now()`) and use it as the `key`.
