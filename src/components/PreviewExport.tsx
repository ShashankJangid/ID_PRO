import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Eye,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  Package,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
// html2canvas and jspdf are dynamically imported in export functions to reduce bundle size and INP
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import CardRenderer, { getImageUrl } from './CardRenderer';
import type { CardData, ExportFormat } from '@/types';
import { imageUrlToBase64 } from './DataImport';

const CARD_PREVIEW_STYLE = { boxShadow: '0 4px 24px rgba(0,0,0,0.15)', borderRadius: 12 };

// Concurrency-capped runner helper
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      results[index] = await fn(item, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Preload a single image into memory and decode it asynchronously
const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.decode) {
        img.decode()
          .then(() => resolve(img))
          .catch(() => resolve(img)); // fallback resolve if decode fails
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      resolve(img); // resolve to prevent blocking export on broken assets
    };
    img.src = url;
  });
};

// Scan the template and organization to preload all static assets exactly once
const preloadStaticAssets = async (
  template: any,
  organization: any
): Promise<Map<string, HTMLImageElement>> => {
  const cache = new Map<string, HTMLImageElement>();
  const urlsToPreload = new Set<string>();

  if (template.backgroundImage) {
    urlsToPreload.add(template.backgroundImage);
  }
  if (template.backgroundImageBack) {
    urlsToPreload.add(template.backgroundImageBack);
  }

  const checkElements = (elements: any[]) => {
    for (const el of elements) {
      if (el.type === 'image' && el.imageSource !== 'photo') {
        const url = getImageUrl(el, {} as CardData, organization);
        if (url) {
          urlsToPreload.add(url);
        }
      }
    }
  };

  checkElements(template.frontElements || []);
  checkElements(template.backElements || []);

  const urls = Array.from(urlsToPreload);
  const images = await Promise.all(urls.map((url) => preloadImage(url)));
  for (let i = 0; i < urls.length; i++) {
    cache.set(urls[i], images[i]);
  }

  return cache;
};

const PreviewExport: React.FC = () => {
  const {
    cardDataList,
    activeCardIndex,
    setActiveCardIndex,
    getActiveTemplate,
    organization,
    showToast,
    updateActiveCard,
    setCardDataList,
  } = useAppStore(
    useShallow((s) => ({
      cardDataList: s.cardDataList,
      activeCardIndex: s.activeCardIndex,
      setActiveCardIndex: s.setActiveCardIndex,
      getActiveTemplate: s.getActiveTemplate,
      organization: s.organization,
      showToast: s.showToast,
      updateActiveCard: s.updateActiveCard,
      setCardDataList: s.setCardDataList,
    }))
  );

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [pdfQuality, setPdfQuality] = useState<'compressed' | 'original'>('compressed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const [rangeFrom, setRangeFrom] = useState<number | ''>(1);
  const [rangeTo, setRangeTo] = useState<number | ''>('');

  // Initialize selected indices to include all cards by default when the card list loads
  useEffect(() => {
    setSelectedIndices(new Set(cardDataList.map((_, i) => i)));
    setRangeFrom(cardDataList.length > 0 ? 1 : '');
    setRangeTo(cardDataList.length);
  }, [cardDataList]);

  const handleRangeChange = (fromVal: number | '', toVal: number | '') => {
    setRangeFrom(fromVal);
    setRangeTo(toVal);

    if (fromVal === '' || toVal === '') return;
    const start = Math.min(fromVal, toVal);
    const end = Math.max(fromVal, toVal);

    const next = new Set<number>();
    const startIdx = Math.max(1, start) - 1;
    const endIdx = Math.min(cardDataList.length, end) - 1;

    for (let i = startIdx; i <= endIdx; i++) {
      next.add(i);
    }
    setSelectedIndices(next);
  };

  // Background self-healing loop: download raw URLs and save them as base64 in the store
  const failedUrlsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    const rawPhotoCards = cardDataList.filter(
      (c) =>
        c.photo &&
        (c.photo.startsWith('http://') || c.photo.startsWith('https://') || c.photo.startsWith('//')) &&
        !failedUrlsRef.current.has(c.photo)
    );
    if (rawPhotoCards.length === 0) return;

    let active = true;
    const processPhotos = async () => {
      const updatedList = [...cardDataList];
      let changed = false;

      for (let i = 0; i < updatedList.length; i++) {
        if (!active) return;
        const card = updatedList[i];
        if (
          card.photo &&
          (card.photo.startsWith('http://') || card.photo.startsWith('https://') || card.photo.startsWith('//')) &&
          !failedUrlsRef.current.has(card.photo)
        ) {
          const normalized = card.photo.startsWith('//') ? `https:${card.photo}` : card.photo;
          try {
            const b64 = await imageUrlToBase64(normalized);
            if (b64 !== card.photo) {
              updatedList[i] = { ...card, photo: b64 };
              changed = true;
            } else {
              // Direct and proxy failed, add to failed list to skip retrying
              failedUrlsRef.current.add(card.photo);
            }
          } catch (e) {
            console.error('Failed to convert photo in background:', e);
            failedUrlsRef.current.add(card.photo);
          }
        }
      }

      if (changed && active) {
        setCardDataList(updatedList);
      }
    };

    processPhotos();
    return () => {
      active = false;
    };
  }, [cardDataList, setCardDataList]);

  const template = getActiveTemplate();
  const activeCard = cardDataList[activeCardIndex];

  const toggleSelect = (i: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const filteredCards = searchQuery
    ? cardDataList.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cardDataList;

  const isAllFilteredSelected = filteredCards.length > 0 && filteredCards.every((card) => {
    const idx = cardDataList.indexOf(card);
    return selectedIndices.has(idx);
  });

  const toggleSelectAllFiltered = () => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      const filteredIndices = filteredCards.map((card) => cardDataList.indexOf(card));
      if (isAllFilteredSelected) {
        // Deselect all filtered
        filteredIndices.forEach((idx) => next.delete(idx));
      } else {
        // Select all filtered
        filteredIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  };

  // Helper: Convert template pixels to mm for PDF export
  const pixelsToMm = (pixels: number, dpi: number = 96) => {
    return (pixels * 25.4) / dpi;
  };

  // Get PDF dimensions from template (in mm)
  const getPdfDimensions = () => {
    if (!template) return { cardW: 54.0, cardH: 85.6 };
    const dpi = template.dpi || 96;
    return {
      cardW: pixelsToMm(template.cardWidth, dpi),
      cardH: pixelsToMm(template.cardHeight, dpi),
    };
  };

  // ─── Capture card to canvas ───
  const captureCard = useCallback(
    async (
      card: CardData,
      cardSide: 'front' | 'back'
    ): Promise<HTMLCanvasElement> => {
      if (!template) throw new Error('No template');

      // Create an off-screen iframe to completely isolate the rendering context.
      // This guarantees html2canvas does not see any host document styles (like Tailwind, Vite CSS),
      // preventing the parser from crashing with "unexpected EOF" and resolving all race conditions.
      const iframe = document.createElement('iframe');
      iframe.style.cssText = [
        'position:absolute',
        'left:0',
        'top:0',
        `width:${template.cardWidth}px`,
        `height:${template.cardHeight}px`,
        'margin:0',
        'padding:0',
        'border:none',
        'z-index:-9999',
        'pointer-events:none',
        'opacity:0',
        'visibility:hidden',
      ].join(';');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        iframe.remove();
        throw new Error('Could not access iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Export</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: transparent;
            }
            .id-card-render, .id-card-render * {
              box-sizing: border-box !important;
            }
            .id-card-render > div, .id-card-render > img {
              margin: 0 !important;
              padding: 0;
            }
            .card-export-root {
              font-family: Inter, sans-serif;
              font-size: 16px;
              line-height: normal;
              color: #000;
            }
          </style>
        </head>
        <body>
          <div id="export-capture-container" style="width: ${template.cardWidth}px; height: ${template.cardHeight}px; position: relative; overflow: hidden; background: #ffffff;"></div>
        </body>
        </html>
      `);
      iframeDoc.close();

      // Copy loaded fonts so text metrics stay consistent
      if (document.fonts && iframeDoc.fonts) {
        document.fonts.forEach((font) => {
          try {
            iframeDoc.fonts.add(font);
          } catch (_) {}
        });
      }

      const container = iframeDoc.getElementById('export-capture-container')!;

      // Render CardRenderer inside the iframe container
      let root: any = null;
      await new Promise<void>((resolve) => {
        root = createRoot(container);
        root.render(
          React.createElement(CardRenderer, {
            template,
            cardData: card,
            organization,
            side: cardSide,
            scale: 1,
            style: { boxShadow: 'none', borderRadius: 0, transform: 'none', transformOrigin: 'top left' },
            isExport: true,
          })
        );
        
        let checks = 0;
        const checkReady = () => {
          const hasCard = container.querySelector('.id-card-render');
          const imgs = Array.from(container.querySelectorAll('img'));
          const allDone = imgs.every((img) => img.complete);

          if (hasCard && allDone) {
            resolve();
          } else if (checks > 40) { // 400ms max timeout fallback
            resolve();
          } else {
            checks++;
            setTimeout(checkReady, 10);
          }
        };
        setTimeout(checkReady, 15);
      });

      // Await fonts ready inside the iframe context
      if (iframeDoc.fonts) await iframeDoc.fonts.ready;

      // Await any inner images loading
      const imgs = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((res) => {
              if ((img as HTMLImageElement).complete) res();
              else {
                (img as HTMLImageElement).onload = () => res();
                (img as HTMLImageElement).onerror = () => res();
              }
            })
        )
      );

      // Two paint frames: first for layout, second for paint — ensures shapes are fully composited
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      let canvas: HTMLCanvasElement | undefined;
      try {
        const { default: html2canvas } = await import('html2canvas');
        canvas = await html2canvas(container, {
          scale: pdfQuality === 'compressed' ? 2 : 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: template.cardWidth,
          height: template.cardHeight,
          logging: false,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: false,
          proxy: undefined,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Body/html resets inside cloned iframe
            if (clonedDoc.body) {
              clonedDoc.body.style.cssText = 'margin:0;padding:0;overflow:hidden;position:relative';
            }
            if (clonedDoc.documentElement) {
              clonedDoc.documentElement.style.cssText = 'margin:0;padding:0;overflow:hidden';
            }

            // Neutralize any scale() transform on the card wrapper itself — it confuses
            // html2canvas when computing absolute child offsets.
            const cardWrapper = clonedDoc.querySelector('.id-card-render') as HTMLElement | null;
            if (cardWrapper) {
              cardWrapper.style.transform = 'none';
              cardWrapper.style.transformOrigin = 'top left';
              cardWrapper.style.margin = '0';
              cardWrapper.style.padding = '0';
            }

            const dv = clonedDoc.defaultView || window;

            // Resolve line-heights to px for text elements to prevent vertical shift
            clonedDoc.querySelectorAll('[data-element-type="text"]').forEach((el) => {
              const h = el as HTMLElement;
              const cs = dv.getComputedStyle(h);
              if (cs.position !== 'absolute') return;
              h.style.verticalAlign = 'top';
              h.style.overflow = 'visible';
              const lh = h.style.lineHeight;
              const fs = parseFloat(cs.fontSize) || 14;
              if (!lh || lh === 'normal') {
                h.style.lineHeight = `${Math.round(fs * 1.4)}px`;
              } else if (!lh.endsWith('px')) {
                const n = parseFloat(lh);
                h.style.lineHeight = isNaN(n)
                  ? `${Math.round(fs * 1.4)}px`
                  : `${Math.round(fs * (lh.endsWith('%') ? n / 100 : n))}px`;
              }
              h.style.paddingTop = h.style.paddingTop || '0';
              h.style.paddingBottom = h.style.paddingBottom || '0';
            });
          },
        });
      } finally {
        if (root) root.unmount();
        iframe.remove();
      }

      return canvas;
    },
    [template, organization, pdfQuality]
  );

  // ─── Export Single Card ───
  const exportSingle = async (format: ExportFormat) => {
    if (!activeCard || !template) return;
    setExporting(true);
    setExportProgress(0);
    const { jsPDF } = await import('jspdf');

    try {
      // 1. Await fonts ready once globally
      if (document.fonts) await document.fonts.ready;

      // 2. Preload assets
      await preloadStaticAssets(template, organization);

      const hasBackSide = !!(template.backElements && template.backElements.length > 0);
      const isCompressed = pdfQuality === 'compressed';
      const imgType = isCompressed ? 'JPEG' : 'PNG';

      if (format === 'pdf') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        let backCanvas: HTMLCanvasElement | null = null;
        if (hasBackSide) {
          backCanvas = await captureCard(activeCard, 'back');
          setExportProgress(80);
        }

        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
        
        const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
        pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
        
        if (hasBackSide && backCanvas) {
          pdf.addPage([cardW, cardH], 'portrait');
          const backDataUrl = isCompressed ? backCanvas.toDataURL('image/jpeg', 0.82) : backCanvas.toDataURL('image/png');
          pdf.addImage(backDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
        }
        pdf.save(`${activeCard.code || 'id_card'}.pdf`);
      } else if (format === 'png') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        let backCanvas: HTMLCanvasElement | null = null;
        if (hasBackSide) {
          backCanvas = await captureCard(activeCard, 'back');
          setExportProgress(80);
        }

        const link = document.createElement('a');
        link.download = `${activeCard.code || 'id_card'}_front.png`;
        link.href = frontCanvas.toDataURL('image/png');
        link.click();

        if (hasBackSide && backCanvas) {
          setTimeout(() => {
            const link2 = document.createElement('a');
            link2.download = `${activeCard.code || 'id_card'}_back.png`;
            link2.href = backCanvas!.toDataURL('image/png');
            link2.click();
          }, 100);
        }
      } else if (format === 'print') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        let backCanvas: HTMLCanvasElement | null = null;
        if (hasBackSide) {
          backCanvas = await captureCard(activeCard, 'back');
          setExportProgress(80);
        }

        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
        
        const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
        pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
        
        if (hasBackSide && backCanvas) {
          pdf.addPage([cardW, cardH], 'portrait');
          const backDataUrl = isCompressed ? backCanvas.toDataURL('image/jpeg', 0.82) : backCanvas.toDataURL('image/png');
          pdf.addImage(backDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
        }
        pdf.autoPrint();
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }

      setExportProgress(100);
      showToast('Export completed!', 'success');
    } catch (err) {
      showToast('Export failed: ' + (err as Error).message, 'error');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // ─── Export Selected Cards ───
  const exportAll = async (format: ExportFormat, separatePdf: boolean = false) => {
    if (!template || cardDataList.length === 0) return;

    // Filter selected cards
    const cardsToExport = cardDataList.filter((_, idx) => selectedIndices.has(idx));

    if (cardsToExport.length === 0) {
      showToast('No cards selected for export.', 'error');
      return;
    }

    setExporting(true);
    setExportProgress(0);

    try {
      // 1. Await fonts ready once globally
      if (document.fonts) await document.fonts.ready;

      // 2. Preload assets
      await preloadStaticAssets(template, organization);

      const { jsPDF } = await import('jspdf');

      const hasBackSide = !!(template.backElements && template.backElements.length > 0);
      const isCompressed = pdfQuality === 'compressed';
      const imgType = isCompressed ? 'JPEG' : 'PNG';

      // 3. Construct concurrency tasks
      type CaptureTask = {
        card: CardData;
        side: 'front' | 'back';
        cardIndex: number;
      };

      const tasks: CaptureTask[] = [];
      cardsToExport.forEach((card, index) => {
        tasks.push({ card, side: 'front', cardIndex: index });
        if (hasBackSide) {
          tasks.push({ card, side: 'back', cardIndex: index });
        }
      });

      // 4. Capture all canvases concurrently (limit 3)
      let completedTasks = 0;
      const taskResults = await runWithConcurrency(tasks, 3, async (task) => {
        const canvas = await captureCard(task.card, task.side);
        completedTasks++;
        setExportProgress(Math.round((completedTasks / tasks.length) * 100));
        return { canvas, side: task.side, cardIndex: task.cardIndex };
      });

      // 5. Assemble format-specific outputs sequentially
      if (format === 'pdf') {
        const { cardW, cardH } = getPdfDimensions();

        if (separatePdf) {
          // Download PDFs one-by-one
          for (let i = 0; i < cardsToExport.length; i++) {
            const card = cardsToExport[i];
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

            if (hasBackSide) {
              const frontCanvas = taskResults[i * 2].canvas;
              const backCanvas = taskResults[i * 2 + 1].canvas;
              
              const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
              const backDataUrl = isCompressed ? backCanvas.toDataURL('image/jpeg', 0.82) : backCanvas.toDataURL('image/png');
              
              pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
              pdf.addPage([cardW, cardH], 'portrait');
              pdf.addImage(backDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
            } else {
              const frontCanvas = taskResults[i].canvas;
              const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
              pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
            }

            pdf.save(`${card.code || 'id_card'}_${card.name || i + 1}.pdf`);
            // Small delay to prevent browser throttling/skipping downloads
            await new Promise((r) => setTimeout(r, 150));
          }
        } else {
          // Single PDF
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

          if (hasBackSide) {
            for (let i = 0; i < cardsToExport.length; i++) {
              const frontCanvas = taskResults[i * 2].canvas;
              const backCanvas = taskResults[i * 2 + 1].canvas;
              
              const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
              const backDataUrl = isCompressed ? backCanvas.toDataURL('image/jpeg', 0.82) : backCanvas.toDataURL('image/png');

              if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
              pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
              pdf.addPage([cardW, cardH], 'portrait');
              pdf.addImage(backDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
            }
          } else {
            // Front only
            for (let i = 0; i < cardsToExport.length; i++) {
              const frontCanvas = taskResults[i].canvas;
              const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');

              if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
              pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
            }
          }
          pdf.save('all_id_cards.pdf');
        }
      } else if (format === 'png') {
        // PNG export
        for (let i = 0; i < taskResults.length; i++) {
          const { canvas, side, cardIndex } = taskResults[i];
          const card = cardsToExport[cardIndex];
          const link = document.createElement('a');
          link.download = `${card.code || 'card'}_${cardIndex + 1}_${side}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          // Delay to prevent browser throttling/skipping downloads
          await new Promise((r) => setTimeout(r, 100));
        }
      } else if (format === 'print') {
        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

        if (hasBackSide) {
          for (let i = 0; i < cardsToExport.length; i++) {
            const frontCanvas = taskResults[i * 2].canvas;
            const backCanvas = taskResults[i * 2 + 1].canvas;
            
            const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');
            const backDataUrl = isCompressed ? backCanvas.toDataURL('image/jpeg', 0.82) : backCanvas.toDataURL('image/png');

            if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
            pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
            pdf.addPage([cardW, cardH], 'portrait');
            pdf.addImage(backDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
          }
        } else {
          // Front only
          for (let i = 0; i < cardsToExport.length; i++) {
            const frontCanvas = taskResults[i].canvas;
            const frontDataUrl = isCompressed ? frontCanvas.toDataURL('image/jpeg', 0.82) : frontCanvas.toDataURL('image/png');

            if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
            pdf.addImage(frontDataUrl, imgType, 0, 0, cardW, cardH, undefined, isCompressed ? 'FAST' : undefined);
          }
        }

        pdf.autoPrint();
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }

      showToast(`Exported ${cardsToExport.length} cards!`, 'success');
    } catch (err) {
      showToast('Bulk export failed: ' + (err as Error).message, 'error');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // ─── Delete Individual Card ───
  const deleteCard = (originalIdx: number) => {
    if (cardDataList.length <= 1) {
      showToast('Cannot delete the last card.', 'error');
      return;
    }
    const list = cardDataList.filter((_, i) => i !== originalIdx);
    setCardDataList(list);

    // Adjust activeCardIndex
    if (activeCardIndex >= list.length) {
      setActiveCardIndex(Math.max(0, list.length - 1));
    }

    // Adjust selectedIndices
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < originalIdx) {
          next.add(idx);
        } else if (idx > originalIdx) {
          next.add(idx - 1);
        }
      });
      return next;
    });

    showToast('Record deleted', 'info');
  };

  // ─── Remove Selected Cards ───
  const removeSelectedCards = () => {
    const selectedCount = cardDataList.filter((_, idx) => selectedIndices.has(idx)).length;
    if (selectedCount === 0) {
      showToast('No cards selected to remove.', 'error');
      return;
    }
    if (selectedCount === cardDataList.length) {
      if (window.confirm('Are you sure you want to remove ALL records? You must have at least one record.')) {
        // Keep a default record
        const defaultCard: CardData = {
          name: 'Sample Name', role: 'Designation', code: 'DEMO-001',
          dob: '01-01-2000', blood: 'A+', contact: '+91-XXXXXXXXXX',
          address: 'School Address, City', issued: '01-06-2025',
          valid: '31-05-2026', emergency: '+91-XXXXXXXXXX',
        };
        setCardDataList([defaultCard]);
        setActiveCardIndex(0);
        setSelectedIndices(new Set([0]));
        showToast('All records cleared and reset to sample.', 'success');
      }
      return;
    }

    if (window.confirm(`Are you sure you want to remove the ${selectedCount} selected records?`)) {
      const list = cardDataList.filter((_, idx) => !selectedIndices.has(idx));
      setCardDataList(list);
      setActiveCardIndex(0);
      setSelectedIndices(new Set());
      showToast(`Removed ${selectedCount} records.`, 'success');
    }
  };

  if (!template || !activeCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No template or data selected</p>
          <p className="text-gray-400 text-sm mt-1">Select a template and import data first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel - Card list */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 px-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredCards.length > 0 && isAllFilteredSelected}
                ref={(el) => {
                  if (el) {
                    const anySelected = filteredCards.some((c) => selectedIndices.has(cardDataList.indexOf(c)));
                    const allSelected = filteredCards.every((c) => selectedIndices.has(cardDataList.indexOf(c)));
                    el.indeterminate = anySelected && !allSelected;
                  }
                }}
                onChange={toggleSelectAllFiltered}
                className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span>Select All Matching</span>
            </label>
            <span>
              {cardDataList.filter((_, idx) => selectedIndices.has(idx)).length} of {cardDataList.length} selected
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-gray-100 pt-2 text-[10px]">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-gray-400 font-medium">From:</span>
              <input
                type="number"
                min={1}
                max={cardDataList.length}
                value={rangeFrom}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  handleRangeChange(val, rangeTo);
                }}
                className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-400 font-medium">Till:</span>
              <input
                type="number"
                min={1}
                max={cardDataList.length}
                value={rangeTo}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  handleRangeChange(rangeFrom, val);
                }}
                placeholder={String(cardDataList.length)}
                className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-400 font-medium">(Last: {cardDataList.length})</span>
            </div>
            <button
              onClick={removeSelectedCards}
              className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 font-medium transition-colors whitespace-nowrap"
              title="Remove selected cards"
            >
              Remove Selected
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCards.map((card, idx) => {
            const originalIdx = cardDataList.indexOf(card);
            const isSelected = selectedIndices.has(originalIdx);
            return (
              <div
                key={idx}
                className={`flex items-center border-b border-gray-50 transition-colors hover:bg-gray-50 group ${
                  originalIdx === activeCardIndex ? 'bg-emerald-50/60 border-l-4 border-l-emerald-500' : ''
                }`}
              >
                <div className="pl-3 pr-2 flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(originalIdx)}
                    className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setActiveCardIndex(originalIdx)}
                  className="flex-1 px-2 py-2.5 text-left outline-none min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {card.code} • {card.role}
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to remove ${card.name || 'this card'}?`)) {
                      deleteCard(originalIdx);
                    }
                  }}
                  className="p-1.5 mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remove card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center - Card Preview */}
      <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              {activeCardIndex + 1} / {cardDataList.length}
            </span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setSide('front')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  side === 'front' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setSide('back')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  side === 'back' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Back
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCardIndex(Math.max(0, activeCardIndex - 1))}
              disabled={activeCardIndex === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveCardIndex(Math.min(cardDataList.length - 1, activeCardIndex + 1))}
              disabled={activeCardIndex === cardDataList.length - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card preview — scale to fit */}
        <div className="flex-1 overflow-auto flex justify-center items-start p-8">
          <div
            style={{
              width: template.cardWidth * 0.55,
              height: template.cardHeight * 0.55,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', position: 'absolute' }}>
              <CardRenderer
                template={template}
                cardData={activeCard}
                organization={organization}
                side={side}
                scale={1}
                style={CARD_PREVIEW_STYLE}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Export controls */}
      <div className="w-72 bg-white dark:bg-[hsl(222,47%,7%)] border-l border-gray-200 dark:border-[hsl(222,47%,18%)] p-5 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Export Options</h3>

        <div className="space-y-2 mb-6">
          {[
            { id: 'pdf' as ExportFormat, icon: FileText, label: 'PDF', desc: 'Standard card size (54 x 85.6 mm)' },
            { id: 'png' as ExportFormat, icon: FileImage, label: 'PNG Images', desc: 'High resolution images' },
            { id: 'print' as ExportFormat, icon: Printer, label: 'Print', desc: 'Open print dialog' },
          ].map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setExportFormat(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
                exportFormat === id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${exportFormat === id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${exportFormat === id ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {(exportFormat === 'pdf' || exportFormat === 'print') && (
          <div className="mb-6 pt-4 border-t border-gray-100 dark:border-[hsl(222,47%,18%)]">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">PDF Size / Quality</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPdfQuality('compressed')}
                className={`px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all flex flex-col items-center justify-center leading-tight ${
                  pdfQuality === 'compressed'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <span>Standard (JPEG)</span>
                <span className="text-[9px] font-normal opacity-70 mt-0.5">Compressed (&lt; 1MB)</span>
              </button>
              <button
                onClick={() => setPdfQuality('original')}
                className={`px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all flex flex-col items-center justify-center leading-tight ${
                  pdfQuality === 'original'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <span>HD Print (PNG)</span>
                <span className="text-[9px] font-normal opacity-70 mt-0.5">Uncompressed (~3MB)</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => exportSingle(exportFormat)}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportFormat === 'pdf'
              ? `Export Current Card (${pdfQuality === 'compressed' ? 'Small PDF' : 'HD PDF'})`
              : 'Export Current Card'}
          </button>

          {cardDataList.length > 1 && (
            <button
              onClick={() => exportAll(exportFormat, false)}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {exportFormat === 'pdf'
                ? `Export Selected (${pdfQuality === 'compressed' ? 'Single Small PDF' : 'Single HD PDF'})`
                : `Export Selected (${cardDataList.filter((_, idx) => selectedIndices.has(idx)).length})`}
            </button>
          )}

          {cardDataList.length > 1 && exportFormat === 'pdf' && (
            <button
              onClick={() => exportAll('pdf', true)}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfQuality === 'compressed'
                ? `Export Small PDFs One-by-One (${cardDataList.filter((_, idx) => selectedIndices.has(idx)).length})`
                : `Export HD PDFs One-by-One (${cardDataList.filter((_, idx) => selectedIndices.has(idx)).length})`}
            </button>
          )}
        </div>

        {exporting && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Exporting...</span>
              <span className="text-xs font-semibold text-emerald-600">{exportProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Current Card</h4>
          <div className="space-y-2 text-xs">
            {[
              ['Name', activeCard.name],
              ['Code', activeCard.code],
              ['Role', activeCard.role],
              ['Template', template.name],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 truncate ml-2 max-w-[140px]">{val}</span>
              </div>
            ))}
          </div>

          {/* Photo Upload */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Card Photo</h4>
            <label className="cursor-pointer block">
              <div className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                {activeCard.photo ? (
                  <img src={activeCard.photo} alt="Card photo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center px-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Click to upload photo</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">JPG, PNG supported</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateActiveCard({ photo: reader.result as string });
                    showToast('Photo uploaded!', 'success');
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {activeCard.photo && (
              <button
                className="mt-2 w-full text-xs text-red-400 hover:text-red-600 hover:underline transition-colors"
                onClick={() => updateActiveCard({ photo: undefined })}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewExport;
