import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { CardTemplate, CardData, CardElement, Organization, QRFieldKey } from '@/types';
import { getFieldValue } from '@/store';

interface CardRendererProps {
  template: CardTemplate;
  cardData: CardData;
  organization: Organization;
  side: 'front' | 'back';
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

function getImageUrl(
  el: CardElement,
  cardData: CardData,
  organization: Organization
): string | null {
  const src = el.imageSource;
  if (!src) return el.staticImageUrl || null;

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
    case 'photo':      return cardData?.photo || null;
    case 'logo':       return organization.logos?.[0]?.data || organization.logo || null;
    case 'signature1': return organization.signatures?.[0]?.data || organization.signature1 || null;
    case 'signature2': return organization.signatures?.[1]?.data || organization.signature2 || null;
    case 'custom':     return el.staticImageUrl || null;
    default:           return el.staticImageUrl || null;
  }
}

function buildQRData(
  el: CardElement,
  cardData: CardData,
  org: Organization
): string {
  const fields = (el.qrFields && el.qrFields.length > 0)
    ? el.qrFields
    : ((org.defaultQRFields && org.defaultQRFields.length > 0)
        ? org.defaultQRFields
        : ['name', 'code', 'role'] as QRFieldKey[]);

  const fieldLabelMap: Record<string, string> = {
    name: 'Name', role: 'Role', code: 'ID', dob: 'DOB', blood: 'Blood',
    contact: 'Contact', address: 'Address', issued: 'Issued', valid: 'Valid',
    emergency: 'Emergency', orgName: 'Org', orgAddress: 'Address', orgPhone: 'OrgPhone',
    orgEmail: 'OrgEmail', orgWebsite: 'Website', orgTagline: 'Tagline', orgEmergency: 'OrgEmergency',
    custom1: 'Custom1', custom2: 'Custom2', custom3: 'Custom3'
  };

  const lines: string[] = [];
  for (const f of fields) {
    const label = fieldLabelMap[f] || f;
    const value = getFieldValue(cardData, f as any, org);
    if (value) lines.push(`${label}: ${value}`);
  }

  const result = lines.join(' / ');
  return result || cardData?.code || cardData?.name || 'ID';
}

function renderElement(
  el: CardElement,
  cardData: CardData,
  org: Organization
): React.ReactNode {
  const value = el.field ? getFieldValue(cardData, el.field, org) : '';
  const displayText = el.staticText || value || (el.field ? `[${el.label}]` : '');
  const imgUrl = el.imageSource ? getImageUrl(el, cardData, org) : (el.staticImageUrl || null);

  const s = el.style;

  // Base style — position absolute, exact coords
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    zIndex: el.zIndex || 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };

  switch (el.type) {
    case 'text': {
      const fontSize = s.fontSize || 14;
      const lineHeight = s.lineHeight || 1.4;
      // Use minHeight so text is never clipped, but element still positions at el.y
      const minH = Math.max(el.height, Math.ceil(fontSize * lineHeight));

      const textStyle: React.CSSProperties = {
        ...baseStyle,
        // NO fixed height — use minHeight to prevent clipping
        minHeight: minH,
        fontSize,
        fontFamily: s.fontFamily || 'Inter, sans-serif',
        fontWeight: s.fontWeight || '400',
        color: s.color || '#000',
        textAlign: (s.textAlign as any) || 'left',
        letterSpacing: s.letterSpacing,
        lineHeight,
        textTransform: s.textTransform || 'none',
        // Critical: flex column so text starts at top (no vertical centering offset)
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        overflow: 'visible',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        backgroundColor: s.backgroundColor || 'transparent',
        borderRadius: s.backgroundColor ? s.borderRadius : undefined,
        padding: s.backgroundColor ? '2px 6px' : 0,
        // Remove any browser default margin/padding that causes offset
        margin: 0,
        boxSizing: 'border-box',
      };
      return (
        <div key={el.id} style={textStyle}>
          <span style={{ display: 'block', width: '100%', textAlign: (s.textAlign as any) || 'left' }}>
            {displayText}
          </span>
        </div>
      );
    }

    case 'image': {
      const imgStyle: React.CSSProperties = {
        ...baseStyle,
        height: el.height,
        objectFit: (s.objectFit as any) || 'cover',
        borderRadius: s.borderRadius,
        border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#000'}` : undefined,
        boxShadow: s.shadow,
        display: 'block',
      };

      if (imgUrl) {
        return <img key={el.id} src={imgUrl} alt={el.label} style={imgStyle} />;
      }
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            height: el.height,
            backgroundColor: '#f0f0f0',
            borderRadius: s.borderRadius,
            border: `2px dashed ${s.borderColor || '#ccc'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#999',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {el.label}
        </div>
      );
    }

    case 'shape': {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            height: el.height,
            background: s.gradient || s.backgroundColor || '#ccc',
            opacity: s.opacity,
            borderRadius:
              s.shapeType === 'circle'
                ? '50%'
                : s.shapeType === 'rounded-rect'
                ? s.borderRadius || 12
                : s.borderRadius || 0,
            boxShadow: s.shadow,
          }}
        />
      );
    }

    case 'qr': {
      const qrValue = buildQRData(el, cardData, org);
      console.log('QR Value:', qrValue);
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
            boxSizing: 'border-box',
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={Math.min(el.width, el.height) - 8}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      );
    }

    case 'barcode': {
      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            height: el.height,
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
  const bgImage = side === 'front' ? template.backgroundImage : (template.backgroundImageBack || template.backgroundImage);
  const canvaEmbedUrl = side === 'front' ? template.canvaEmbedUrl : (template.canvaEmbedUrlBack || template.canvaEmbedUrl);

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
      // Reset any inherited line-height that could shift text
      lineHeight: 'normal',
      fontSize: 'initial',
      ...style,
    }),
    [template.cardWidth, template.cardHeight, scale, style]
  );

  return (
    <div className={className} style={cardStyle}>
      {canvaEmbedUrl ? (
        <iframe
          src={canvaEmbedUrl}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            border: 'none', zIndex: 0,
            pointerEvents: 'none',
            display: 'block',
          }}
          title="Canva Design"
        />
      ) : bgImage ? (
        <img
          src={bgImage}
          alt="card background"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'fill',
            zIndex: 0,
            pointerEvents: 'none',
            display: 'block',
          }}
        />
      ) : null}
      {elements.map((el) => renderElement(el, cardData, organization))}
    </div>
  );
};

export default React.memo(CardRenderer);
