import React from 'react';
import { QR_FIELD_OPTIONS } from '@/types';
import type { QRFieldKey } from '@/types';

interface QRFieldPickerProps {
  selectedFields: QRFieldKey[];
  onChange: (fields: QRFieldKey[]) => void;
  columns?: 2 | 3;
}

const QRFieldPicker: React.FC<QRFieldPickerProps> = ({
  selectedFields,
  onChange,
  columns = 3,
}) => {
  const handleToggle = (key: QRFieldKey) => {
    if (selectedFields.includes(key)) {
      onChange(selectedFields.filter((k) => k !== key));
    } else {
      onChange([...selectedFields, key]);
    }
  };

  const gridColsClass = columns === 2 ? 'grid-cols-2 gap-1' : 'grid-cols-3 gap-2';
  const paddingClass = columns === 2 ? 'px-2 py-1 text-[9px]' : 'px-3 py-2 text-xs';

  return (
    <div className={`grid ${gridColsClass}`}>
      {QR_FIELD_OPTIONS.map(({ key, label }) => {
        const active = selectedFields.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleToggle(key)}
            className={`flex items-center gap-1.5 rounded-lg border font-medium transition-all text-left ${paddingClass} ${
              active
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`rounded border-2 flex-shrink-0 flex items-center justify-center ${
                columns === 2 ? 'w-3 h-3' : 'w-3.5 h-3.5'
              } ${active ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}
            >
              {active && (
                <svg
                  width={columns === 2 ? '7' : '8'}
                  height={columns === 2 ? '7' : '8'}
                  viewBox={columns === 2 ? '0 0 7 7' : '0 0 8 8'}
                  fill="none"
                >
                  <path
                    d={columns === 2 ? 'M1 3.5l1.5 1.5 3-3' : 'M1.5 4l1.5 1.5 3.5-3.5'}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QRFieldPicker;
