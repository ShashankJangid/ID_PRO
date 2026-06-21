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
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAppStore } from '@/store';
import CardRenderer from './CardRenderer';
import type { CardData, ExportFormat } from '@/types';

const PreviewExport: React.FC = () => {
  const {
    cardDataList,
    activeCardIndex,
    setActiveCardIndex,
    getActiveTemplate,
    organization,
    showToast,
    updateActiveCard,
  } = useAppStore();

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Initialize selected indices to include all cards by default when the card list loads
  useEffect(() => {
    setSelectedIndices(new Set(cardDataList.map((_, i) => i)));
  }, [cardDataList]);

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
    async (card: CardData, cardSide: 'front' | 'back'): Promise<HTMLCanvasElement> => {
      if (!template) throw new Error('No template');

      // Off-screen container at EXACT card size — positioned absolutely at top-left
      // of document body but invisible (opacity 0) to avoid user-visible flicker.
      const wrapper = document.createElement('div');
      wrapper.id = 'export-capture-wrapper';
      wrapper.style.cssText = [
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
        'overflow:hidden',
        // Reset any global CSS that could shift text
        'line-height:normal',
        'font-size:16px',
      ].join(';');
      document.body.appendChild(wrapper);

      // Inner container — exact card pixel dimensions, no transform
      const container = document.createElement('div');
      container.id = 'export-capture-container';
      container.style.cssText = [
        `width:${template.cardWidth}px`,
        `height:${template.cardHeight}px`,
        'overflow:hidden',
        'position:relative',
        'background:#ffffff',
        'margin:0',
        'padding:0',
        'border:none',
        // Reset inherited styles that cause text shift
        'line-height:normal',
        'font-size:16px',
        'font-family:Inter,sans-serif',
      ].join(';');
      wrapper.appendChild(container);

      // Render CardRenderer with scale=1 (no transform)
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
            style: { boxShadow: 'none', borderRadius: 0, transform: 'none' },
          })
        );
        // Wait for React to paint + fonts + images
        setTimeout(resolve, 800);
      });

      // Fonts
      if (document.fonts) await document.fonts.ready;

      // Images
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

      // Extra paint frame
      await new Promise((r) => requestAnimationFrame(r));

      const canvas = await html2canvas(container, {
        scale: 3,           // 3x for print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: template.cardWidth,
        height: template.cardHeight,
        logging: false,
        // Since clonedWrapper is isolated at 0,0 and scroll is 0, crop at exactly 0,0
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        // Disable foreignObject — more reliable cross-browser text rendering
        foreignObjectRendering: false,
        // Remove any proxy
        proxy: undefined,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Reset body and html element styles to avoid browser default margin/padding/scrollbar shifts
          if (clonedDoc.body) {
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.padding = '0';
            clonedDoc.body.style.overflow = 'hidden';
            clonedDoc.body.style.position = 'relative';
          }
          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.margin = '0';
            clonedDoc.documentElement.style.padding = '0';
            clonedDoc.documentElement.style.overflow = 'hidden';
          }

          // Copy loaded fonts from parent document to clone to prevent font fallback metrics mismatch
          if (document.fonts && clonedDoc.fonts) {
            document.fonts.forEach((font) => {
              clonedDoc.fonts.add(font);
            });
          }

          // Clear everything else from the cloned document's body to prevent layout pollution/scrollbars
          const clonedWrapper = clonedDoc.getElementById('export-capture-wrapper');
          if (clonedWrapper && clonedDoc.body) {
            clonedDoc.body.innerHTML = '';
            clonedDoc.body.appendChild(clonedWrapper);

            // Re-style clonedWrapper to occupy the exact origin 0,0 perfectly
            clonedWrapper.style.position = 'absolute';
            clonedWrapper.style.left = '0';
            clonedWrapper.style.top = '0';
            clonedWrapper.style.width = `${template.cardWidth}px`;
            clonedWrapper.style.height = `${template.cardHeight}px`;
            clonedWrapper.style.opacity = '1';
            clonedWrapper.style.zIndex = '1';
            clonedWrapper.style.visibility = 'visible';
            clonedWrapper.style.display = 'block';
            clonedWrapper.style.margin = '0';
            clonedWrapper.style.padding = '0';
            clonedWrapper.style.border = 'none';
            clonedWrapper.style.overflow = 'hidden';
          }

          const clonedContainer = clonedDoc.getElementById('export-capture-container');
          if (clonedContainer) {
            clonedContainer.style.position = 'absolute';
            clonedContainer.style.left = '0';
            clonedContainer.style.top = '0';
            clonedContainer.style.margin = '0';
            clonedContainer.style.padding = '0';
            clonedContainer.style.border = 'none';
            clonedContainer.style.overflow = 'hidden';
          }


          // Force all positioned elements in the clone to zero margin and box-sizing
          // and ensure text elements have stable line-height (prevents the ~15px shift)
          const defaultView = clonedDoc.defaultView || window;
          const allDivs = clonedDoc.querySelectorAll('div, span, p, img');
          allDivs.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = defaultView.getComputedStyle(htmlEl);
            if (computedStyle.position === 'absolute') {
              htmlEl.style.margin = '0';
              htmlEl.style.boxSizing = 'border-box';
              htmlEl.style.verticalAlign = 'top';
              if (htmlEl.getAttribute('data-element-type') === 'text') {
                // Prevent html2canvas from applying extra line-height from the
                // browser's default UA stylesheet which causes the ~15px shift
                htmlEl.style.overflow = 'visible';
                // Preserve the existing computed line-height from the inline style
                // (already set correctly by CardRenderer) — just ensure it's explicit
                const existingLH = htmlEl.style.lineHeight;
                if (!existingLH || existingLH === 'normal') {
                  const fontSize = parseFloat(computedStyle.fontSize) || 14;
                  htmlEl.style.lineHeight = `${Math.round(fontSize * 1.4)}px`;
                }
                htmlEl.style.paddingTop = htmlEl.style.paddingTop || '0';
                htmlEl.style.paddingBottom = htmlEl.style.paddingBottom || '0';
              }
            }
          });
        },

      });

      if (root) root.unmount();
      document.body.removeChild(wrapper);

      return canvas;
    },
    [template, organization]
  );

  // ─── Export Single Card ───
  const exportSingle = async (format: ExportFormat) => {
    if (!activeCard || !template) return;
    setExporting(true);
    setExportProgress(0);

    try {
      if (format === 'pdf') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        const backCanvas = await captureCard(activeCard, 'back');
        setExportProgress(80);

        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
        pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
        pdf.addPage([cardW, cardH], 'portrait');
        pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
        pdf.save(`${activeCard.code || 'id_card'}.pdf`);
      } else if (format === 'png') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        const backCanvas = await captureCard(activeCard, 'back');
        setExportProgress(80);

        const link = document.createElement('a');
        link.download = `${activeCard.code || 'id_card'}_front.png`;
        link.href = frontCanvas.toDataURL('image/png');
        link.click();

        setTimeout(() => {
          const link2 = document.createElement('a');
          link2.download = `${activeCard.code || 'id_card'}_back.png`;
          link2.href = backCanvas.toDataURL('image/png');
          link2.click();
        }, 200);
      } else if (format === 'print') {
        const frontCanvas = await captureCard(activeCard, 'front');
        setExportProgress(50);
        const backCanvas = await captureCard(activeCard, 'back');
        setExportProgress(80);

        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
        pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
        pdf.addPage([cardW, cardH], 'portrait');
        pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
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
  const exportAll = async (format: ExportFormat) => {
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
      if (format === 'pdf') {
        const { cardW, cardH } = getPdfDimensions();
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

        for (let i = 0; i < cardsToExport.length; i++) {
          const card = cardsToExport[i];
          const frontCanvas = await captureCard(card, 'front');
          const backCanvas = await captureCard(card, 'back');
          if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
          pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
          pdf.addPage([cardW, cardH], 'portrait');
          pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
          setExportProgress(Math.round(((i + 1) / cardsToExport.length) * 100));
        }
        pdf.save('all_id_cards.pdf');
      } else {
        for (let i = 0; i < cardsToExport.length; i++) {
          const card = cardsToExport[i];
          const frontCanvas = await captureCard(card, 'front');
          const link = document.createElement('a');
          link.download = `${card.code || 'card'}_${i + 1}_front.png`;
          link.href = frontCanvas.toDataURL('image/png');
          link.click();
          await new Promise((r) => setTimeout(r, 300));
          setExportProgress(Math.round(((i + 1) / cardsToExport.length) * 100));
        }
      }
      showToast(`Exported ${cardsToExport.length} cards!`, 'success');
    } catch (err) {
      showToast('Bulk export failed: ' + (err as Error).message, 'error');
    } finally {
      setExporting(false);
      setExportProgress(0);
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
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCards.map((card, idx) => {
            const originalIdx = cardDataList.indexOf(card);
            const isSelected = selectedIndices.has(originalIdx);
            return (
              <div
                key={idx}
                className={`flex items-center border-b border-gray-50 transition-colors hover:bg-gray-50 ${
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
                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', borderRadius: 12 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Export controls */}
      <div className="w-72 bg-white border-l border-gray-200 p-5 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Export Options</h3>

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
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${exportFormat === id ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${exportFormat === id ? 'text-emerald-800' : 'text-gray-700'}`}>{label}</p>
                <p className="text-[10px] text-gray-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => exportSingle(exportFormat)}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Current Card
          </button>

          {cardDataList.length > 1 && (
            <button
              onClick={() => exportAll(exportFormat)}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Export Selected ({cardDataList.filter((_, idx) => selectedIndices.has(idx)).length})
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
