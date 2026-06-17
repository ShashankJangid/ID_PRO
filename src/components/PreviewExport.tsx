import React, { useState, useCallback } from 'react';
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

  const template = getActiveTemplate();
  const activeCard = cardDataList[activeCardIndex];

  const filteredCards = searchQuery
    ? cardDataList.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cardDataList;

  // ─── Capture card to canvas using real CardRenderer ───
  const captureCard = useCallback(
    async (card: CardData, cardSide: 'front' | 'back'): Promise<HTMLCanvasElement> => {
      if (!template) throw new Error('No template');

      // Create a hidden wrapper at top-left to avoid coordinate precision/offscreen layout issues
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';
      wrapper.style.zIndex = '-9999';
      wrapper.style.pointerEvents = 'none';
      document.body.appendChild(wrapper);

      // Create container inside the wrapper at exact card size
      const container = document.createElement('div');
      container.style.width = `${template.cardWidth}px`;
      container.style.height = `${template.cardHeight}px`;
      container.style.overflow = 'hidden';
      wrapper.appendChild(container);

      const cardStyle = { boxShadow: 'none', borderRadius: 0 };
      let root: any = null;
      // Render the real CardRenderer React component into the container
      await new Promise<void>((resolve) => {
        root = createRoot(container);
        root.render(
          React.createElement(CardRenderer, {
            template,
            cardData: card,
            organization,
            side: cardSide,
            scale: 1,
            style: cardStyle,
          })
        );
        // Give React + images time to fully render
        setTimeout(resolve, 700);
      });

      // Wait for all custom fonts in the document to be fully loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Wait for all images inside to fully load
      const imgs = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if ((img as HTMLImageElement).complete) resolve();
              else {
                (img as HTMLImageElement).onload = () => resolve();
                (img as HTMLImageElement).onerror = () => resolve();
              }
            })
        )
      );

      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: template.cardWidth,
        height: template.cardHeight,
        logging: false,
        windowWidth: template.cardWidth,
        windowHeight: template.cardHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      if (root) {
        root.unmount();
      }
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

        const cardW = 54.0; // mm
        const cardH = 85.6; // mm
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

        const cardW = 54.0;
        const cardH = 85.6;
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

  // ─── Export All Cards ───
  const exportAll = async (format: ExportFormat) => {
    if (!template || cardDataList.length === 0) return;
    setExporting(true);
    setExportProgress(0);

    try {
      if (format === 'pdf') {
        const cardW = 54.0;
        const cardH = 85.6;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

        for (let i = 0; i < cardDataList.length; i++) {
          const card = cardDataList[i];
          const frontCanvas = await captureCard(card, 'front');
          const backCanvas = await captureCard(card, 'back');

          if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
          pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
          pdf.addPage([cardW, cardH], 'portrait');
          pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);

          setExportProgress(Math.round(((i + 1) / cardDataList.length) * 100));
        }

        pdf.save('all_id_cards.pdf');
      } else {
        // PNG bulk - use JSZip approach
        for (let i = 0; i < cardDataList.length; i++) {
          const card = cardDataList[i];
          const frontCanvas = await captureCard(card, 'front');

          const link = document.createElement('a');
          link.download = `${card.code || 'card'}_${i + 1}_front.png`;
          link.href = frontCanvas.toDataURL('image/png');
          link.click();

          // Small delay to prevent browser blocking
          await new Promise((r) => setTimeout(r, 300));
          setExportProgress(Math.round(((i + 1) / cardDataList.length) * 100));
        }
      }

      showToast(`Exported ${cardDataList.length} cards!`, 'success');
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
          <p className="text-xs text-gray-500 mt-2">
            {filteredCards.length} of {cardDataList.length} cards
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCards.map((card, idx) => {
            const originalIdx = cardDataList.indexOf(card);
            return (
              <button
                key={idx}
                onClick={() => setActiveCardIndex(originalIdx)}
                className={`w-full px-4 py-2.5 text-left border-b border-gray-50 transition-colors ${
                  originalIdx === activeCardIndex ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
                <p className="text-xs text-gray-500">
                  {card.code} • {card.role}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center - Card Preview */}
      <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
        {/* Toolbar */}
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
              onClick={() =>
                setActiveCardIndex(Math.min(cardDataList.length - 1, activeCardIndex + 1))
              }
              disabled={activeCardIndex === cardDataList.length - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card preview area */}
        <div className="flex-1 overflow-auto flex justify-center p-6 pt-6">
          <div className="transform scale-[0.55] origin-top">
            <CardRenderer
              template={template}
              cardData={activeCard}
              organization={organization}
              side={side}
              scale={1}
            />
          </div>
        </div>
      </div>

      {/* Right panel - Export controls */}
      <div className="w-72 bg-white border-l border-gray-200 p-5 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Export Options</h3>

        {/* Format selection */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => setExportFormat('pdf')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
              exportFormat === 'pdf'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText className={`w-5 h-5 ${exportFormat === 'pdf' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${exportFormat === 'pdf' ? 'text-emerald-800' : 'text-gray-700'}`}>
                PDF
              </p>
              <p className="text-[10px] text-gray-500">Standard card size (54 x 85.6 mm)</p>
            </div>
          </button>

          <button
            onClick={() => setExportFormat('png')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
              exportFormat === 'png'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileImage className={`w-5 h-5 ${exportFormat === 'png' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${exportFormat === 'png' ? 'text-emerald-800' : 'text-gray-700'}`}>
                PNG Images
              </p>
              <p className="text-[10px] text-gray-500">High resolution images</p>
            </div>
          </button>

          <button
            onClick={() => setExportFormat('print')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
              exportFormat === 'print'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Printer className={`w-5 h-5 ${exportFormat === 'print' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${exportFormat === 'print' ? 'text-emerald-800' : 'text-gray-700'}`}>
                Print
              </p>
              <p className="text-[10px] text-gray-500">Open print dialog</p>
            </div>
          </button>
        </div>

        {/* Export actions */}
        <div className="space-y-3">
          <button
            onClick={() => exportSingle(exportFormat)}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export Current Card
          </button>

          {cardDataList.length > 1 && (
            <button
              onClick={() => exportAll(exportFormat)}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-all"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              Export All ({cardDataList.length})
            </button>
          )}
        </div>

        {/* Progress */}
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

        {/* Card info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Current Card</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{activeCard.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Code</span>
              <span className="font-medium text-gray-900">{activeCard.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900">{activeCard.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Template</span>
              <span className="font-medium text-gray-900">{template.name}</span>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Card Photo</h4>
            <label className="cursor-pointer block">
              <div className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                {activeCard.photo ? (
                  <img
                    src={activeCard.photo}
                    alt="Card photo"
                    className="w-full h-full object-cover rounded-xl"
                  />
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
