# Handoff Report — Bug Hunt Exploration

This handoff report summarizes the findings of the comprehensive functional bug hunt across the codebase in `src/`.

---

## 1. Observation

We directly investigated the following codebase files and identified specific code blocks causing or contributing to bugs:

### A. Memory Leak in Favicon Generation (`src/App.tsx`)
In `src/App.tsx` (lines 165-176):
```typescript
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
```
Every time the theme changes, a new Blob URL is created but the previous one is never revoked.

### B. UI Blocking Delay on Login (`src/App.tsx` & `src/components/LoginPage.tsx`)
In `src/App.tsx` (lines 192-195):
```typescript
          setTimeout(() => {
            setUser(u);
            setAuthLoading(false);
          }, 1200);
```
And in `src/components/LoginPage.tsx` (e.g. lines 155-157, 174-176, 229-231, 277-279):
```typescript
      setTimeout(() => {
        onLogin();
      }, 1200);
```
These lines enforce artificial 1200ms delays during authentication steps.

### C. Synchronous Firestore Sync (`src/store/index.ts`)
In `src/store/index.ts` (lines 219-227, 232-240, 241-255, 274-281, 282-290, 291-302):
- Database writes (`saveProfileToFirestore`, `saveTemplateToFirestore`) are triggered synchronously inside the Zustand state reducers without any debouncing.

### D. Default Placeholder Address (`src/store/index.ts`)
In `src/store/index.ts` (line 78):
```typescript
  address: 'School Address, City',
```
The default placeholder address is still `'School Address, City'`.

### E. Image Fetch CORS and Fallback (`src/components/DataImport.tsx`)
In `src/components/DataImport.tsx` (lines 961-975):
```typescript
            try {
              const b64 = await imageUrlToBase64(normalisePhotoUrl(card.photo));
              return { ...card, photo: b64 };
            } catch {
              // Photo download failed — keep card but clear the broken URL
              return { ...card, photo: undefined };
            }
```
If an image fetch fails due to CORS or network errors, the photo field is completely cleared (set to `undefined`), losing the reference.

### F. Print Preview Blob URL Lifetime (`src/components/PreviewExport.tsx`)
In `src/components/PreviewExport.tsx` (lines 534-537, 702-705):
```typescript
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
```
Print previews create Blob URLs that are cleaned up after a hardcoded 60-second timeout.

### G. Element Rotation in Designer (`src/components/designer/DesignerCanvas.tsx` & `src/hooks/useDragResize.ts`)
In `src/components/designer/DesignerCanvas.tsx` (lines 96-115), the selection overlay does not apply the element's rotation style:
```typescript
            <div
              key={el.id}
              onMouseDown={(e) => onMouseDown(e, el.id)}
              className={`absolute cursor-move ${ ... }`}
              style={{
                left: el.x * zoom,
                top: el.y * zoom,
                width: el.width * zoom,
                height: el.height * zoom,
                // No transform/rotation is defined here!
              }}
```
And in `src/hooks/useDragResize.ts` (lines 100-101), resizing deltas do not account for rotation:
```typescript
        const dx = (e.clientX - dragStartMouse.x) / zoom;
        const dy = (e.clientY - dragStartMouse.y) / zoom;
```

### H. Custom Field Keys (`src/components/OrganizationSetup.tsx`)
In `src/components/OrganizationSetup.tsx` (lines 347-379), custom field keys are editable inputs:
```typescript
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateCustomField(idx, { key: e.target.value })}
```
And map key index `idx` is used as a React key:
```typescript
                  {customFields.map((field, idx) => (
                    <div key={idx} ...>
```

---

## 2. Logic Chain

1. **Favicon Leak**: If a user changes theme colors, `generateFavicon` allocates a new Object URL. Because `URL.revokeObjectURL` is never called, the browser keeps all previous SVG Blobs in memory, causing a leak. Revoking the previous `link.href` (if it's a blob) resolves this.
2. **UI Delay**: The 1200ms timeouts on login slow down the app transition. Removing the `setTimeout` in both `App.tsx` and `LoginPage.tsx` allows instant navigation to the dashboard.
3. **Firestore Sync**: Modifying template elements (dragging/resizing) or typing in forms calls state setters continuously. Since these setters immediately invoke Firestore writes, it causes excessive network traffic and rate limit errors. Implementing a key-based debouncer resolves this by queuing writes.
4. **Placeholder Address**: The default placeholder value remains unchanged at `'School Address, City'`. Modifying line 78 in `src/store/index.ts` will resolve this.
5. **CORS Fallback**: If an image lacks CORS headers, `fetch` fails. Clearing the photo field prevents the browser from trying to load it directly using the image tag (which does not require CORS to render). Retaining the original URL is a better fallback.
6. **Preview Export Blobs**: Blob URLs created for PDFs are kept in memory for 60 seconds. If the user closes the app before that, they depend on garbage collection. While not a severe leak, a shorter delay or lifecycle-based cleanup is recommended.
7. **Designer Rotation**: 
   - Since the selection box doesn't rotate, it visually desyncs from the rotated card element. Applying `transform: rotate` to the overlay container aligns them.
   - Resizing calculations assume the element is axis-aligned. For a rotated element, mouse movements on the screen must be mapped to the element's local coordinate system to prevent skewed dimensions.

---

## 3. Caveats

- We did not investigate external server configuration for CORS headers since we are operating in a read-only local code environment.
- The behavior of `html2canvas` capturing cross-origin frames (such as Canva embeds) is restricted by browser security policies and cannot be bypassed client-side without a backend CORS proxy.

---

## 4. Conclusion

The codebase contains several high-impact functional bugs:
- Memory leaks in favicon generation.
- Unnecessary UI delays during login.
- Potential database rate-limiting and performance lag from non-debounced Firestore writes.
- Visual and functional bugs in the designer canvas when elements are rotated.
- Weak error fallbacks for CORS image fetches and editable custom keys that can break template data.

All proposed fixes are detailed in `analysis.md` in the working directory.

---

## 5. Verification Method

To verify the findings and fixes:
1. **Favicon Leak**: Open browser DevTools, monitor the memory profile, change the theme color repeatedly, and check if the number of allocated blob URLs grows.
2. **UI Delay**: Log in to the application and observe if the dashboard appears instantly or with a noticeable delay.
3. **Firestore Sync**: Perform drag-and-resize actions on a template in the designer. Monitor the network panel in DevTools and confirm that database writes are debounced (only 1 request sent after dragging stops) rather than fired on every pixel move.
4. **Rotation Bug**: Add a text element, rotate it 45 degrees, and verify if the selection ring and resizing handles rotate with the element.
5. **CORS Fallback**: Import data with a public, non-CORS image URL. Check that the image is still rendered in the table/card preview (browser rendering) instead of disappearing.
