import React from 'react';
import { Upload, Trash2, Image as ImageIcon, Tag, Stamp, PenLine, Package, Star } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

// ── Icon types for labelling ─────────────────────────────────
export type AssetIconType = 'logo' | 'signature' | 'stamp' | 'badge' | 'banner' | 'watermark' | 'other';

const ICON_OPTIONS: { value: AssetIconType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'logo',       label: 'Logo',       icon: <ImageIcon className="w-3 h-3" />,  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'signature',  label: 'Signature',  icon: <PenLine className="w-3 h-3" />,   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'stamp',      label: 'Stamp',      icon: <Stamp className="w-3 h-3" />,     color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'badge',      label: 'Badge',      icon: <Star className="w-3 h-3" />,      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'banner',     label: 'Banner',     icon: <Tag className="w-3 h-3" />,       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'watermark',  label: 'Watermark',  icon: <Package className="w-3 h-3" />,   color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'other',      label: 'Other',      icon: <ImageIcon className="w-3 h-3" />, color: 'bg-gray-100 text-gray-500 border-gray-200' },
];

interface ImageItem {
  key: string;
  label: string;
  data: string;
  iconType?: AssetIconType;
}

interface ImageCollectionSectionProps {
  items: ImageItem[];
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, updates: { label?: string; data?: string; iconType?: AssetIconType }) => void;
  emptyMessage: string;
  prefix: string; // "logo" | "signature" | "asset"
  labelPlaceholder: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  columns?: 3 | 4;
  /** If true, shows the icon-type picker (for the Assets section) */
  showIconPicker?: boolean;
}

const ImageCollectionSection: React.FC<ImageCollectionSectionProps> = ({
  items,
  onRemove,
  onUpdate,
  emptyMessage,
  prefix,
  labelPlaceholder,
  showToast,
  columns = 3,
  showIconPicker = false,
}) => {
  const { uploadFile } = useFileUpload({
    maxSizeInBytes: 5 * 1024 * 1024, // 5 MB
    onError: (err) => showToast(err, 'error'),
  });

  const gridClass = columns === 4 ? 'grid-cols-4 gap-3' : 'grid-cols-3 gap-3';
  const minHeight = prefix === 'asset' ? 64 : 80;
  const imgHeight = prefix === 'asset' ? 'h-12' : 'h-16';

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className={`grid ${gridClass}`}>
          {items.map((item, idx) => {
            const fileInputRef = React.createRef<HTMLInputElement>();
            const selectedIcon = ICON_OPTIONS.find(o => o.value === (item.iconType || 'other'));

            return (
              <div
                key={item.key}
                className="border border-gray-200 rounded-xl p-3 bg-gray-50 relative group flex flex-col gap-2"
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="absolute top-2 right-2 p-1 bg-red-50 text-red-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Image upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-center justify-center bg-white"
                  style={{ minHeight }}
                >
                  {item.data ? (
                    <img
                      src={item.data}
                      alt={item.label || prefix}
                      className={`w-full ${imgHeight} object-contain`}
                    />
                  ) : (
                    <div className="py-2">
                      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-400">Click to upload</p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const b64 = await uploadFile(file);
                      if (b64) {
                        onUpdate(idx, { data: b64 });
                        showToast('Image uploaded!', 'success');
                      }
                    }
                  }}
                />

                {/* Icon type picker — shown only for assets */}
                {showIconPicker && (
                  <div>
                    <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Type</p>
                    <div className="flex flex-wrap gap-1">
                      {ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onUpdate(idx, { iconType: opt.value })}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold transition-all ${
                            (item.iconType || 'other') === opt.value
                              ? opt.color + ' shadow-sm scale-105'
                              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}
                          title={opt.label}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Label input */}
                <div className="flex items-center gap-1.5">
                  {/* Show the selected icon inline with the label */}
                  {showIconPicker && selectedIcon ? (
                    <span className={`flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 ${selectedIcon.color}`}>
                      {selectedIcon.icon}
                    </span>
                  ) : (
                    <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(idx, { label: e.target.value })}
                    placeholder={labelPlaceholder}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>

                {/* Label preview badge */}
                {item.label && (
                  <div className="flex items-center gap-1">
                    {showIconPicker && selectedIcon && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-semibold ${selectedIcon.color}`}>
                        {selectedIcon.icon}
                        {selectedIcon.label}
                      </span>
                    )}
                    <p className="text-[9px] text-emerald-600 font-mono truncate">
                      → <strong>{item.label}</strong>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageCollectionSection;
export type { ImageItem };
