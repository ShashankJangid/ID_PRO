import React, { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { CardTemplate, CardData, CardElement, Organization, QRFieldKey } from '@/types';
import { getFieldValue } from '@/store';

/** Helper to measure text width using a HTML5 canvas */
function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return 0;
  const canvas = (measureTextWidth as any).canvas || ((measureTextWidth as any).canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
}

/** Helper to scale down font size until it fits container width */
function getFittedFontSize(
  text: string,
  maxWidth: number,
  originalSize: number,
  fontWeight: string,
  fontFamily: string
): number {
  if (!maxWidth || maxWidth <= 0 || !text) return originalSize;
  let size = originalSize;
  const minSize = 6; // Do not go below 6px
  while (size > minSize) {
    const fontStr = `${fontWeight} ${size}px ${fontFamily}`;
    const measuredWidth = measureTextWidth(text, fontStr);
    if (measuredWidth <= maxWidth) {
      return size;
    }
    size -= 0.5; // step down by 0.5px
  }
  return minSize;
}

interface CardRendererProps {
  template: CardTemplate;
  cardData: CardData;
  organization: Organization;
  side: 'front' | 'back';
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}


/** Get image URL for image source */
export function getImageUrl(
  el: CardElement,
  cardData: CardData,
  organization: Organization
): string | null {
  const src = el.imageSource;
  if (!src) return el.staticImageUrl || null;

  // Dynamic indexed sources: logo_N, signature_N, asset_N
  if (src.startsWith('logo_')) {
    const idx = parseInt(src.split('_')[1]);
    return organization.logos?.[idx]?.data || null;
  }
  if (src.startsWith('signature_')) {
    const idx = parseInt(src.split('_')[1]);
    return organization.signatures?.[idx]?.data || null;
  }
  if (src.startsWith('asset_')) {
    const idx = parseInt(src.split('_')[1]);
    return organization.assets?.[idx]?.data || null;
  }

  switch (src) {
    case 'photo': return cardData.photo || null;
    case 'logo': return organization.logos?.[0]?.data || organization.logo || null;
    case 'signature1': return organization.signatures?.[0]?.data || organization.signature1 || null;
    case 'signature2': return organization.signatures?.[1]?.data || organization.signature2 || null;
    case 'custom': return el.staticImageUrl || null;
    default: return el.staticImageUrl || null;
  }
}


/**
 * Get the raw value for a QR field key, reading from both cardData and org.
 */
function getQRFieldValue(
  key: QRFieldKey,
  cardData: CardData,
  org: Organization
): string {
  switch (key) {
    case 'orgName': return org.name || '';
    case 'orgPhone': return org.phone || '';
    case 'orgEmail': return org.email || '';
    case 'orgWebsite': return org.website || '';
    // All person fields live on cardData
    default: return (cardData as Record<string, string | undefined>)[key] || '';
  }
}

/**
 * Build the QR code string.
 * Format: "Label: Value / Label: Value / ..."  (single line, ' / ' separator)
 * Falls back to card code/name if nothing is selected or all values are empty.
 */
export function buildQRData(
  el: CardElement,
  cardData: CardData,
  org: Organization
): string {
  // Priority: element's own qrFields > org default > built-in fallback
  const fields: QRFieldKey[] =
    (el.qrFields && el.qrFields.length > 0)
      ? el.qrFields
      : (org.defaultQRFields && org.defaultQRFields.length > 0)
        ? org.defaultQRFields
        : ['name', 'code', 'role'];

  const parts: string[] = [];

  for (const key of fields) {
    const value = getQRFieldValue(key, cardData, org).trim();
    if (!value) continue;
    parts.push(value);
  }

  if (parts.length === 0) {
    // Absolute fallback — never return empty string
    const fallback = cardData.code || cardData.name || 'ID Card';
    return fallback.toUpperCase();
  }

  // Join values by "  /  " and convert everything to UPPERCASE
  return parts.join('  /  ').toUpperCase();
}

/** Render a single card element */
function renderElement(
  el: CardElement,
  cardData: CardData,
  org: Organization
): React.ReactNode {
  const value = el.field ? getFieldValue(cardData, el.field, org) : '';
  const displayText = el.staticText || value || (el.field ? `[${el.label}]` : '');
  const imgUrl = el.imageSource ? getImageUrl(el, cardData, org) : (el.staticImageUrl || null);

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.type === 'text' ? 'auto' : el.height,
    minHeight: el.type === 'text' ? el.height : undefined,
    zIndex: el.zIndex || 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    overflow: el.type === 'text' ? 'visible' : 'hidden',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  };

  const s = el.style;

  switch (el.type) {
    case 'text': {
      const isAutoScalingField = el.field === 'name' || el.field === 'role';
      const originalFontSize = s.fontSize || 14;
      const fontFamily = s.fontFamily || 'Inter, sans-serif';
      const fontWeight = s.fontWeight || '400';

      const paddingX = s.backgroundColor ? 16 : 0;
      const maxWidth = el.width ? el.width - paddingX : 0;

      const fittedFontSize = isAutoScalingField && maxWidth > 0
        ? getFittedFontSize(displayText, maxWidth, originalFontSize, fontWeight, fontFamily)
        : originalFontSize;

      const resolveLineHeight = () => {
        const lh = s.lineHeight;
        if (!lh) return `${Math.round(fittedFontSize * 1.4)}px`;
        const lhStr = String(lh).trim();
        if (lhStr.endsWith('px')) return lhStr;
        if (lhStr === 'normal') return `${Math.round(fittedFontSize * 1.4)}px`;
        const val = parseFloat(lhStr);
        if (isNaN(val)) return `${Math.round(fittedFontSize * 1.4)}px`;
        // If it's a relative value (like 1.4 or 120%), convert to px
        const scaleFactor = lhStr.endsWith('%') ? val / 100 : val;
        return `${Math.round(fittedFontSize * scaleFactor)}px`;
      };

      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontSize: fittedFontSize,
        fontFamily: fontFamily,
        fontWeight: fontWeight,
        color: s.color || '#000',
        textAlign: (s.textAlign as any) || 'left',
        letterSpacing: s.letterSpacing,
        lineHeight: resolveLineHeight(),
        textTransform: s.textTransform || 'none',
        display: 'block',
        wordBreak: isAutoScalingField ? 'keep-all' : 'break-word',
        whiteSpace: isAutoScalingField ? 'nowrap' : 'pre-wrap',
        backgroundColor: s.backgroundColor || 'transparent',
        borderRadius: s.borderRadius,
        padding: s.backgroundColor ? '4px 8px' : 0,
      };
      return (
        <div key={el.id} data-element-type="text" style={textStyle}>
          {displayText}
        </div>
      );
    }

    case 'image': {
      if (imgUrl) {
        const imgStyle = {
          ...baseStyle,
          objectFit: (s.objectFit as any) || 'cover',
          borderRadius: s.borderRadius,
          border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#000'}` : undefined,
          boxShadow: s.shadow,
        };

        return (
          <img
            key={el.id}
            src={imgUrl}
            alt={el.label}
            crossOrigin="anonymous"
            style={imgStyle}
          />
        );
      }
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            backgroundColor: '#f0f0f0',
            borderRadius: s.borderRadius,
            border: `2px dashed ${s.borderColor || '#ccc'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#999',
            textAlign: 'center',
          }}
        >
          {el.label}
        </div>
      );
    }

    case 'shape': {
      const shapeStyle: React.CSSProperties = {
        ...baseStyle,
        background: s.gradient || s.backgroundColor || '#ccc',
        opacity: s.opacity,
        borderRadius:
          s.shapeType === 'circle'
            ? '50%'
            : s.shapeType === 'rounded-rect'
              ? s.borderRadius || 12
              : s.borderRadius || 0,
        boxShadow: s.shadow,
      };
      return <div key={el.id} style={shapeStyle} />;
    }

    case 'qr': {
      const qrValue = buildQRData(el, cardData, org);
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            height: el.height,
            backgroundColor: s.backgroundColor || '#fff',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeCanvas
            value={qrValue}
            size={256}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      );
    }

    case 'barcode': {
      return (
        <div
          key={el.id}
          data-element-type="text"
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor || '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#666',
            fontFamily: 'monospace',
          }}
        >
          ||| || ||| | || |||| ||
        </div>
      );
    }

    default:
      return null;
  }
}

const CardRenderer: React.FC<CardRendererProps> = ({
  template,
  cardData,
  organization,
  side,
  scale = 1,
  className = '',
  style = {},
}) => {
  const elements = side === 'front' ? template.frontElements : template.backElements;

  const bgImage = side === 'front'
    ? template.backgroundImage
    : (template.backgroundImageBack || template.backgroundImage);
  const canvaEmbedUrl = side === 'front'
    ? template.canvaEmbedUrl
    : (template.canvaEmbedUrlBack || template.canvaEmbedUrl);

  const cardStyle: React.CSSProperties = useMemo(
    () => ({
      width: template.cardWidth,
      height: template.cardHeight,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      borderRadius: 12,
      margin: 0,
      padding: 0,
      border: 'none',
      lineHeight: 'normal',
      fontSize: 'initial',
      ...style,
    }),
    [template.cardWidth, template.cardHeight, scale, style]
  );

  const renderBackground = () => {
    if (canvaEmbedUrl) {
      return (
        <iframe
          src={canvaEmbedUrl}
          sandbox="allow-scripts allow-same-origin"
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

    if (bgImage) {
      const bgStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
        margin: 0,
        padding: 0,
      };

      return (
        <img
          src={bgImage}
          alt="card background"
          crossOrigin="anonymous"
          style={bgStyle}
        />
      );
    }

    return null;
  };

  return (
    <div className={`id-card-render ${className}`.trim()} style={cardStyle}>
      {/* Background — Canva Embed Iframe, Cached Background, or Static Image */}
      {renderBackground()}
      {elements.map((el) => renderElement(el, cardData, organization))}
    </div>
  );
};

export default React.memo(CardRenderer);
