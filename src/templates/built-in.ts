import type { CardTemplate, CardElement, DataField, TextStyleOpts, ShapeStyleOpts } from '@/types';

// ─── Helper to generate unique IDs ───
let _idCounter = 0;
function uid(prefix = 'el'): string {
  return `${prefix}_${++_idCounter}_${Math.random().toString(36).substr(2, 5)}`;
}

// ─── Common text element helper ───
function txt(
  label: string,
  field: DataField | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: TextStyleOpts = {}
): CardElement {
  return {
    id: uid(),
    type: 'text',
    label,
    field,
    staticText: opts.staticText,
    x,
    y,
    width: w,
    height: h,
    style: {
      fontSize: opts.fontSize || 14,
      fontFamily: opts.fontFamily || 'Inter, sans-serif',
      fontWeight: (opts.fontWeight as any) || '600',
      color: opts.color || '#000000',
      textAlign: (opts.textAlign as any) || 'left',
      textTransform: (opts.textTransform as any) || 'none',
      letterSpacing: opts.letterSpacing || 0,
      backgroundColor: opts.backgroundColor,
      borderRadius: opts.borderRadius,
    },
  };
}

// ─── Common image element helper ───
function img(
  label: string,
  source: CardElement['imageSource'],
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    objectFit?: string;
    shadow?: string;
  } = {}
): CardElement {
  return {
    id: uid(),
    type: 'image',
    label,
    imageSource: source,
    x,
    y,
    width: w,
    height: h,
    style: {
      borderRadius: opts.borderRadius ?? 0,
      borderWidth: opts.borderWidth ?? 0,
      borderColor: opts.borderColor,
      objectFit: (opts.objectFit as any) || 'cover',
      shadow: opts.shadow,
    },
  };
}

// ─── Common shape element helper ───
function shape(
  label: string,
  shapeType: CardElement['style']['shapeType'],
  x: number,
  y: number,
  w: number,
  h: number,
  opts: ShapeStyleOpts = {}
): CardElement {
  return {
    id: uid(),
    type: 'shape',
    label,
    x,
    y,
    width: w,
    height: h,
    style: {
      shapeType,
      backgroundColor: opts.backgroundColor || '#cccccc',
      gradient: opts.gradient,
      opacity: opts.opacity ?? 1,
      borderRadius: opts.borderRadius,
      shadow: opts.shadow,
    },
  };
}

// ─── QR code element helper ───
function qr(
  label: string,
  field: DataField | undefined,
  x: number,
  y: number,
  size: number
): CardElement {
  return {
    id: uid(),
    type: 'qr',
    label,
    field,
    x,
    y,
    width: size,
    height: size,
    style: { backgroundColor: '#ffffff' },
  };
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE 1: CORPORATE PRO (Clean, professional)
// ═══════════════════════════════════════════════════════════
export const corporateProTemplate: CardTemplate = {
  id: 'builtin_corporate_pro',
  name: 'Corporate Pro',
  description: 'Clean, professional design ideal for corporate offices and businesses.',
  category: 'corporate',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // Dark header band
    shape('Header Band', 'rectangle', 0, 0, 638, 180, {
      backgroundColor: '#1e293b',
      shadow: '0 2px 8px rgba(0,0,0,0.15)',
    }),
    // Accent line
    shape('Accent Line', 'rectangle', 0, 180, 638, 6, {
      backgroundColor: '#3b82f6',
    }),
    // Logo area
    img('Company Logo', 'logo', 219, 30, 200, 80, {
      objectFit: 'contain',
    }),
    // Org name on header
    txt('Organization Name', 'orgName', 20, 115, 598, 40, {
      fontSize: 18,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'Your Organization',
    }),
    // Photo circle background
    shape('Photo Circle BG', 'circle', 219, 260, 200, 200, {
      backgroundColor: '#f1f5f9',
      borderRadius: 100,
      shadow: '0 4px 12px rgba(0,0,0,0.1)',
    }),
    // Photo
    img('Employee Photo', 'photo', 229, 270, 180, 180, {
      borderRadius: 90,
      objectFit: 'cover',
      borderWidth: 4,
      borderColor: '#3b82f6',
    }),
    // Name
    txt('Full Name', 'name', 20, 510, 598, 55, {
      fontSize: 38,
      color: '#1e293b',
      fontWeight: '800',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
    }),
    // Divider
    shape('Name Divider', 'rectangle', 219, 575, 200, 3, {
      backgroundColor: '#3b82f6',
    }),
    // Role
    txt('Designation', 'role', 20, 590, 598, 40, {
      fontSize: 22,
      color: '#64748b',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
    }),
    // Employee Code
    txt('Employee Code', 'code', 20, 660, 598, 35, {
      fontSize: 20,
      color: '#475569',
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 2,
    }),
    // Info bar at bottom
    shape('Bottom Info Bar', 'rectangle', 0, 920, 638, 90, {
      backgroundColor: '#f8fafc',
    }),
    txt('Issued Date', 'issued', 30, 935, 269, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '500',
      textAlign: 'center',
    }),
    shape('Info Divider', 'rectangle', 319, 935, 1, 55, {
      backgroundColor: '#cbd5e1',
    }),
    txt('Valid Until', 'valid', 339, 935, 269, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '500',
      textAlign: 'center',
    }),
    txt('Issued Label', undefined, 30, 960, 269, 30, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '400',
      textAlign: 'center',
      staticText: 'ISSUED ON',
      letterSpacing: 1,
    }),
    txt('Valid Label', undefined, 339, 960, 269, 30, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '400',
      textAlign: 'center',
      staticText: 'VALID UNTIL',
      letterSpacing: 1,
    }),
  ],
  backElements: [
    // Light background
    shape('Back BG', 'rectangle', 0, 0, 638, 1010, {
      backgroundColor: '#f8fafc',
    }),
    // Dark header band
    shape('Back Header', 'rectangle', 0, 0, 638, 120, {
      backgroundColor: '#1e293b',
    }),
    // Accent line
    shape('Back Accent', 'rectangle', 0, 120, 638, 6, {
      backgroundColor: '#3b82f6',
    }),
    txt('Back Header Title', undefined, 20, 40, 598, 50, {
      fontSize: 22,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
      staticText: 'Employee Information',
    }),
    // Info fields
    txt('DOB Label', undefined, 40, 170, 180, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Date of Birth',
    }),
    txt('Date of Birth', 'dob', 230, 170, 368, 30, {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line 1', 'rectangle', 40, 210, 558, 1, {
      backgroundColor: '#e2e8f0',
    }),

    txt('Blood Label', undefined, 40, 230, 180, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Blood Group',
    }),
    txt('Blood Group', 'blood', 230, 230, 368, 30, {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line 2', 'rectangle', 40, 270, 558, 1, {
      backgroundColor: '#e2e8f0',
    }),

    txt('Contact Label', undefined, 40, 290, 180, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Contact No.',
    }),
    txt('Contact', 'contact', 230, 290, 368, 30, {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line 3', 'rectangle', 40, 330, 558, 1, {
      backgroundColor: '#e2e8f0',
    }),

    txt('Address Label', undefined, 40, 350, 180, 30, {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Address',
    }),
    txt('Address', 'address', 230, 350, 368, 60, {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '500',
      lineHeight: 1.4,
    }),
    shape('Line 4', 'rectangle', 40, 420, 558, 1, {
      backgroundColor: '#e2e8f0',
    }),

    // Emergency section
    shape('Emergency BG', 'rounded-rect', 40, 460, 558, 80, {
      backgroundColor: '#fee2e2',
      borderRadius: 12,
    }),
    txt('Emergency Title', undefined, 60, 472, 518, 25, {
      fontSize: 12,
      color: '#991b1b',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'In Case of Emergency',
    }),
    txt('Emergency Contact', 'emergency', 60, 500, 518, 30, {
      fontSize: 20,
      color: '#dc2626',
      fontWeight: '800',
      letterSpacing: 1,
    }),

    // QR Code
    qr('QR Code', 'code', 244, 580, 150),

    // Signatures
    img('Signature 1', 'signature1', 60, 780, 200, 80, {
      objectFit: 'contain',
    }),
    shape('Sig Line 1', 'rectangle', 60, 870, 200, 2, {
      backgroundColor: '#475569',
    }),
    txt('Sig Label 1', undefined, 60, 880, 200, 25, {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Authorized Signatory',
    }),

    img('Signature 2', 'signature2', 378, 780, 200, 80, {
      objectFit: 'contain',
    }),
    shape('Sig Line 2', 'rectangle', 378, 870, 200, 2, {
      backgroundColor: '#475569',
    }),
    txt('Sig Label 2', undefined, 378, 880, 200, 25, {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Director',
    }),

    // Footer
    shape('Footer', 'rectangle', 0, 960, 638, 50, {
      backgroundColor: '#1e293b',
    }),
    txt('Footer Org', 'orgName', 20, 972, 598, 30, {
      fontSize: 13,
      color: '#94a3b8',
      fontWeight: '500',
      textAlign: 'center',
      staticText: 'Your Organization Name',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 2: SCHOOL CLASSIC (Inspired by original DPS design)
// ═══════════════════════════════════════════════════════════
export const schoolClassicTemplate: CardTemplate = {
  id: 'builtin_school_classic',
  name: 'School Classic',
  description: 'Colorful mosaic design perfect for schools and educational institutions.',
  category: 'school',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // White top area
    shape('Top White', 'rectangle', 0, 0, 638, 200, {
      backgroundColor: '#ffffff',
    }),
    // Green main area
    shape('Green BG', 'rectangle', 0, 200, 638, 700, {
      backgroundColor: '#1a5c2a',
    }),
    // Decorative curved top
    shape('Curve Top', 'circle', -100, 140, 838, 160, {
      backgroundColor: '#1a5c2a',
      opacity: 1,
    }),
    // Mosaic bottom band
    shape('Mosaic Band', 'rectangle', 0, 900, 638, 110, {
      backgroundColor: '#f9c623',
    }),
    // Mosaic decorative squares
    shape('Mosaic 1', 'rectangle', 0, 900, 58, 58, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic 2', 'circle', 10, 910, 38, 38, {
      backgroundColor: '#f9c623',
    }),
    shape('Mosaic 3', 'rectangle', 58, 900, 58, 58, {
      backgroundColor: '#f5820a',
    }),
    shape('Mosaic 3 qc', 'rounded-rect', 58, 900, 58, 58, {
      backgroundColor: '#1a5c2a',
      borderRadius: 0,
    }),
    shape('Mosaic 4', 'rectangle', 116, 900, 58, 58, {
      backgroundColor: '#2e7d32',
    }),
    shape('Mosaic 5', 'rectangle', 174, 900, 58, 58, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic 6', 'rectangle', 232, 900, 58, 58, {
      backgroundColor: '#f9c623',
    }),
    shape('Mosaic 7', 'rectangle', 290, 900, 58, 58, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic 8', 'rectangle', 348, 900, 58, 58, {
      backgroundColor: '#43a047',
    }),
    shape('Mosaic 9', 'rectangle', 406, 900, 58, 58, {
      backgroundColor: '#f5820a',
    }),
    shape('Mosaic 10', 'rectangle', 464, 900, 58, 58, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic 11', 'rectangle', 522, 900, 58, 58, {
      backgroundColor: '#f9c623',
    }),
    shape('Mosaic 12', 'rectangle', 580, 900, 58, 58, {
      backgroundColor: '#2e7d32',
    }),
    // Second mosaic row
    shape('Mosaic r2-1', 'rectangle', 0, 958, 58, 52, {
      backgroundColor: '#43a047',
    }),
    shape('Mosaic r2-2', 'rectangle', 58, 958, 58, 52, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic r2-3', 'rectangle', 116, 958, 58, 52, {
      backgroundColor: '#f9c623',
    }),
    shape('Mosaic r2-4', 'rectangle', 174, 958, 58, 52, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic r2-5', 'rectangle', 232, 958, 58, 52, {
      backgroundColor: '#f5820a',
    }),
    shape('Mosaic r2-6', 'rectangle', 290, 958, 58, 52, {
      backgroundColor: '#2e7d32',
    }),
    shape('Mosaic r2-7', 'rectangle', 348, 958, 58, 52, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic r2-8', 'rectangle', 406, 958, 58, 52, {
      backgroundColor: '#f9c623',
    }),
    shape('Mosaic r2-9', 'rectangle', 464, 958, 58, 52, {
      backgroundColor: '#43a047',
    }),
    shape('Mosaic r2-10', 'rectangle', 522, 958, 58, 52, {
      backgroundColor: '#1a5c2a',
    }),
    shape('Mosaic r2-11', 'rectangle', 580, 958, 58, 52, {
      backgroundColor: '#f5820a',
    }),
    // Logo
    img('School Logo', 'logo', 119, 20, 400, 100, {
      objectFit: 'contain',
    }),
    // Photo ring background
    shape('Photo Ring Outer', 'circle', 169, 250, 300, 300, {
      backgroundColor: '#ffffff',
      borderRadius: 150,
      shadow: '0 0 0 6px rgba(255,255,255,0.3)',
    }),
    shape('Photo Ring Inner', 'circle', 179, 260, 280, 280, {
      backgroundColor: '#e8f5e9',
      borderRadius: 140,
    }),
    // Photo
    img('Student Photo', 'photo', 194, 275, 250, 250, {
      borderRadius: 125,
      objectFit: 'cover',
      borderWidth: 5,
      borderColor: '#ffffff',
    }),
    // Name
    txt('Student Name', 'name', 20, 600, 598, 55, {
      fontSize: 40,
      color: '#ffffff',
      fontWeight: '900',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Role/Class
    txt('Class/Role', 'role', 20, 665, 598, 38, {
      fontSize: 22,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Divider
    shape('Divider', 'rectangle', 219, 720, 200, 1, {
      backgroundColor: 'rgba(255,255,255,0.35)',
    }),
    // Code
    txt('Roll Number', 'code', 20, 740, 598, 32, {
      fontSize: 20,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
      textAlign: 'center',
      letterSpacing: 1,
    }),
    // Dates bar
    txt('Issued Date', 'issued', 30, 800, 269, 28, {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
      textAlign: 'left',
    }),
    txt('Valid Date', 'valid', 339, 800, 269, 28, {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
      textAlign: 'right',
    }),
  ],
  backElements: [
    // Green body
    shape('Back Green', 'rectangle', 0, 0, 638, 1010, {
      backgroundColor: '#1a5c2a',
    }),
    // Mosaic top
    shape('Back Mosaic Band', 'rectangle', 0, 0, 638, 110, {
      backgroundColor: '#f9c623',
    }),
    // Mosaic squares top (simplified)
    shape('BM1', 'rectangle', 0, 0, 58, 58, { backgroundColor: '#1a5c2a' }),
    shape('BM2', 'rectangle', 58, 0, 58, 58, { backgroundColor: '#f5820a' }),
    shape('BM3', 'rectangle', 116, 0, 58, 58, { backgroundColor: '#2e7d32' }),
    shape('BM4', 'rectangle', 0, 58, 58, 52, { backgroundColor: '#43a047' }),
    shape('BM5', 'rectangle', 58, 58, 58, 52, { backgroundColor: '#1a5c2a' }),
    shape('BM6', 'rectangle', 116, 58, 58, 52, { backgroundColor: '#f9c623' }),
    // White wave
    shape('White Wave', 'circle', -200, 680, 1038, 400, {
      backgroundColor: '#ffffff',
    }),
    // Info fields
    txt('DOB Label', undefined, 40, 160, 200, 35, {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '700',
      staticText: 'Date of Birth',
    }),
    txt('DOB Value', 'dob', 260, 160, 338, 35, {
      fontSize: 20,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '400',
    }),
    txt('Blood Label', undefined, 40, 225, 200, 35, {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '700',
      staticText: 'Blood Group',
    }),
    txt('Blood Value', 'blood', 260, 225, 338, 35, {
      fontSize: 20,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '400',
    }),
    txt('Contact Label', undefined, 40, 290, 200, 35, {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '700',
      staticText: 'Contact No.',
    }),
    txt('Contact Value', 'contact', 260, 290, 338, 35, {
      fontSize: 20,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '400',
    }),
    txt('Address Label', undefined, 40, 355, 200, 35, {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '700',
      staticText: 'Address',
    }),
    txt('Address Value', 'address', 260, 355, 338, 70, {
      fontSize: 18,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '400',
      lineHeight: 1.4,
    }),
    // Signatures area (on white wave)
    img('Signature 1', 'signature1', 60, 760, 200, 100, {
      objectFit: 'contain',
    }),
    shape('Sig1 Line', 'rectangle', 60, 870, 200, 2, {
      backgroundColor: '#333',
    }),
    txt('Sig1 Label', undefined, 60, 880, 200, 28, {
      fontSize: 13,
      color: '#444',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Admin. Head',
    }),
    img('Signature 2', 'signature2', 378, 760, 200, 100, {
      objectFit: 'contain',
    }),
    shape('Sig2 Line', 'rectangle', 378, 870, 200, 2, {
      backgroundColor: '#333',
    }),
    txt('Sig2 Label', undefined, 378, 880, 200, 28, {
      fontSize: 13,
      color: '#444',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Principal',
    }),
    // Emergency button
    shape('Emergency BG', 'rounded-rect', 149, 570, 340, 75, {
      backgroundColor: '#1a5c2a',
      borderRadius: 30,
      shadow: '0 4px 12px rgba(0,0,0,0.2)',
    }),
    txt('Emergency Title', undefined, 159, 578, 320, 22, {
      fontSize: 13,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'In Case of Emergency Contact',
    }),
    txt('Emergency Number', 'emergency', 159, 605, 320, 30, {
      fontSize: 22,
      color: '#ffffff',
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 1,
    }),
    // Footer
    shape('Footer Line', 'rectangle', 40, 930, 558, 2, {
      backgroundColor: '#1a5c2a',
    }),
    txt('School Name', 'orgName', 40, 945, 558, 30, {
      fontSize: 18,
      color: '#1a5c2a',
      fontWeight: '800',
      textAlign: 'center',
      staticText: 'SCHOOL NAME',
    }),
    txt('School Address', 'orgAddress', 40, 975, 558, 28, {
      fontSize: 13,
      color: '#444',
      fontWeight: '400',
      textAlign: 'center',
      staticText: 'School Address Line',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 3: MINIMAL ELEGANT
// ═══════════════════════════════════════════════════════════
export const minimalElegantTemplate: CardTemplate = {
  id: 'builtin_minimal_elegant',
  name: 'Minimal Elegant',
  description: 'Clean white design with subtle accents. Perfect for modern organizations.',
  category: 'minimal',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // White background
    shape('BG', 'rectangle', 0, 0, 638, 1010, {
      backgroundColor: '#ffffff',
    }),
    // Left accent bar
    shape('Left Bar', 'rectangle', 0, 0, 12, 1010, {
      backgroundColor: '#000000',
    }),
    // Top thin line
    shape('Top Line', 'rectangle', 12, 60, 626, 2, {
      backgroundColor: '#e5e5e5',
    }),
    // Logo
    img('Logo', 'logo', 50, 90, 250, 60, {
      objectFit: 'contain',
    }),
    // ID Badge label
    txt('Badge Label', undefined, 400, 100, 218, 35, {
      fontSize: 13,
      color: '#999',
      fontWeight: '500',
      textAlign: 'right',
      textTransform: 'uppercase',
      letterSpacing: 3,
      staticText: 'Identity Card',
    }),
    // Photo
    img('Photo', 'photo', 50, 200, 250, 280, {
      objectFit: 'cover',
      borderRadius: 8,
    }),
    // Name (beside photo)
    txt('Name', 'name', 330, 230, 278, 45, {
      fontSize: 28,
      color: '#111',
      fontWeight: '700',
    }),
    // Role
    txt('Role', 'role', 330, 280, 278, 32, {
      fontSize: 16,
      color: '#666',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Divider
    shape('Divider', 'rectangle', 330, 330, 100, 2, {
      backgroundColor: '#000',
    }),
    // ID Code
    txt('ID Code', 'code', 330, 350, 278, 28, {
      fontSize: 14,
      color: '#333',
      fontWeight: '600',
      letterSpacing: 2,
    }),
    // Info section
    shape('Info BG', 'rounded-rect', 50, 540, 538, 280, {
      backgroundColor: '#fafafa',
      borderRadius: 12,
    }),
    txt('DOB', 'dob', 80, 570, 230, 26, {
      fontSize: 14,
      color: '#555',
      fontWeight: '500',
    }),
    txt('Blood', 'blood', 330, 570, 230, 26, {
      fontSize: 14,
      color: '#555',
      fontWeight: '500',
    }),
    txt('Contact', 'contact', 80, 620, 478, 26, {
      fontSize: 14,
      color: '#555',
      fontWeight: '500',
    }),
    txt('Address', 'address', 80, 670, 478, 60, {
      fontSize: 13,
      color: '#555',
      fontWeight: '400',
      lineHeight: 1.5,
    }),
    // Dates at bottom
    shape('Date BG', 'rectangle', 50, 860, 538, 60, {
      backgroundColor: '#000',
      borderRadius: 8,
    }),
    txt('Issued', 'issued', 70, 878, 230, 24, {
      fontSize: 12,
      color: '#aaa',
      fontWeight: '500',
    }),
    txt('Valid', 'valid', 340, 878, 230, 24, {
      fontSize: 12,
      color: '#aaa',
      fontWeight: '500',
    }),
    // Bottom right org name
    txt('Org Name', 'orgName', 50, 960, 538, 30, {
      fontSize: 13,
      color: '#bbb',
      fontWeight: '500',
      textAlign: 'right',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
  ],
  backElements: [
    shape('Back BG', 'rectangle', 0, 0, 638, 1010, {
      backgroundColor: '#fafafa',
    }),
    // Left bar
    shape('Left Bar', 'rectangle', 0, 0, 12, 1010, {
      backgroundColor: '#000000',
    }),
    // QR Code
    qr('QR Code', 'code', 244, 120, 150),
    // Emergency section
    shape('Emerg BG', 'rounded-rect', 50, 380, 538, 120, {
      backgroundColor: '#fff',
      borderRadius: 12,
      shadow: '0 2px 8px rgba(0,0,0,0.06)',
    }),
    txt('Emerg Title', undefined, 80, 400, 478, 25, {
      fontSize: 11,
      color: '#999',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'Emergency Contact',
    }),
    txt('Emerg Value', 'emergency', 80, 435, 478, 40, {
      fontSize: 24,
      color: '#d32f2f',
      fontWeight: '700',
    }),
    // Terms
    txt('Terms', undefined, 50, 580, 538, 80, {
      fontSize: 10,
      color: '#aaa',
      fontWeight: '400',
      lineHeight: 1.6,
      staticText:
        'This card is the property of the issuing organization. If found, please return to the address below. Unauthorized use is prohibited.',
    }),
    // Signatures
    img('Sig1', 'signature1', 50, 720, 200, 80, { objectFit: 'contain' }),
    shape('SigLine1', 'rectangle', 50, 810, 200, 1, { backgroundColor: '#ccc' }),
    txt('SigLabel1', undefined, 50, 820, 200, 22, {
      fontSize: 11,
      color: '#999',
      textAlign: 'center',
      staticText: 'Authorized Signatory',
    }),
    img('Sig2', 'signature2', 388, 720, 200, 80, { objectFit: 'contain' }),
    shape('SigLine2', 'rectangle', 388, 810, 200, 1, { backgroundColor: '#ccc' }),
    txt('SigLabel2', undefined, 388, 820, 200, 22, {
      fontSize: 11,
      color: '#999',
      textAlign: 'center',
      staticText: 'Director',
    }),
    // Footer
    shape('Footer', 'rectangle', 12, 940, 626, 70, {
      backgroundColor: '#000',
    }),
    txt('Footer Org', 'orgName', 40, 958, 568, 28, {
      fontSize: 13,
      color: '#888',
      textAlign: 'center',
    }),
    txt('Footer Address', 'orgAddress', 40, 982, 568, 22, {
      fontSize: 11,
      color: '#666',
      textAlign: 'center',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 4: MEDICAL / HEALTHCARE
// ═══════════════════════════════════════════════════════════
export const medicalTemplate: CardTemplate = {
  id: 'builtin_medical',
  name: 'Medical Care',
  description: 'Clean clinical design with red cross accents for hospitals and clinics.',
  category: 'medical',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // Gradient blue header
    shape('Header', 'rectangle', 0, 0, 638, 250, {
      gradient: 'linear-gradient(135deg, #1565c0, #0d47a1)',
    }),
    // White cross symbol
    shape('Cross V', 'rectangle', 289, 30, 60, 100, {
      backgroundColor: '#ffffff',
      borderRadius: 4,
    }),
    shape('Cross H', 'rectangle', 259, 60, 120, 40, {
      backgroundColor: '#ffffff',
      borderRadius: 4,
    }),
    // Hospital name
    txt('Hospital Name', 'orgName', 20, 150, 598, 45, {
      fontSize: 26,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'HOSPITAL NAME',
    }),
    txt('Hospital Tag', undefined, 20, 195, 598, 30, {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '400',
      textAlign: 'center',
      staticText: 'Care & Compassion',
    }),
    // White body
    shape('Body', 'rectangle', 0, 250, 638, 660, {
      backgroundColor: '#ffffff',
    }),
    // Photo with blue ring
    shape('Photo Ring', 'circle', 219, 300, 200, 200, {
      backgroundColor: '#e3f2fd',
      borderRadius: 100,
      shadow: '0 0 0 4px #1565c0',
    }),
    img('Photo', 'photo', 229, 310, 180, 180, {
      borderRadius: 90,
      objectFit: 'cover',
    }),
    // Staff type badge
    shape('Type Badge', 'rounded-rect', 244, 510, 150, 36, {
      backgroundColor: '#1565c0',
      borderRadius: 18,
    }),
    txt('Staff Type', undefined, 244, 516, 150, 26, {
      fontSize: 13,
      color: '#fff',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Staff Card',
    }),
    // Name
    txt('Name', 'name', 20, 580, 598, 50, {
      fontSize: 34,
      color: '#0d47a1',
      fontWeight: '800',
      textAlign: 'center',
    }),
    // Role
    txt('Role', 'role', 20, 635, 598, 35, {
      fontSize: 20,
      color: '#555',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Department/Code
    txt('Department', 'code', 20, 685, 598, 30, {
      fontSize: 16,
      color: '#777',
      fontWeight: '500',
      textAlign: 'center',
    }),
    // Info cards row
    shape('InfoCard1', 'rounded-rect', 40, 750, 170, 80, {
      backgroundColor: '#e3f2fd',
      borderRadius: 10,
    }),
    txt('DOB Label', undefined, 50, 760, 150, 20, {
      fontSize: 10,
      color: '#1565c0',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Date of Birth',
    }),
    txt('DOB Value', 'dob', 50, 785, 150, 28, {
      fontSize: 14,
      color: '#333',
      fontWeight: '600',
      textAlign: 'center',
    }),
    shape('InfoCard2', 'rounded-rect', 234, 750, 170, 80, {
      backgroundColor: '#ffebee',
      borderRadius: 10,
    }),
    txt('Blood Label', undefined, 244, 760, 150, 20, {
      fontSize: 10,
      color: '#c62828',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Blood Group',
    }),
    txt('Blood Value', 'blood', 244, 785, 150, 28, {
      fontSize: 14,
      color: '#333',
      fontWeight: '600',
      textAlign: 'center',
    }),
    shape('InfoCard3', 'rounded-rect', 428, 750, 170, 80, {
      backgroundColor: '#e8f5e9',
      borderRadius: 10,
    }),
    txt('Contact Label', undefined, 438, 760, 150, 20, {
      fontSize: 10,
      color: '#2e7d32',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Phone',
    }),
    txt('Contact Value', 'contact', 438, 785, 150, 28, {
      fontSize: 14,
      color: '#333',
      fontWeight: '600',
      textAlign: 'center',
    }),
    // Bottom bar
    shape('Bottom', 'rectangle', 0, 910, 638, 100, {
      backgroundColor: '#f5f5f5',
    }),
    txt('Issued', 'issued', 40, 930, 269, 25, {
      fontSize: 12,
      color: '#777',
      textAlign: 'left',
    }),
    txt('Valid', 'valid', 329, 930, 269, 25, {
      fontSize: 12,
      color: '#777',
      textAlign: 'right',
    }),
  ],
  backElements: [
    shape('Back BG', 'rectangle', 0, 0, 638, 1010, {
      backgroundColor: '#f5f5f5',
    }),
    // Blue header
    shape('Back Header', 'rectangle', 0, 0, 638, 150, {
      gradient: 'linear-gradient(135deg, #1565c0, #0d47a1)',
    }),
    txt('Back Title', undefined, 20, 55, 598, 45, {
      fontSize: 22,
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'Medical Information',
    }),
    // White content area
    shape('Content', 'rounded-rect', 30, 180, 578, 400, {
      backgroundColor: '#fff',
      borderRadius: 16,
      shadow: '0 4px 20px rgba(0,0,0,0.08)',
    }),
    txt('Address Label', undefined, 60, 210, 200, 28, {
      fontSize: 12,
      color: '#1565c0',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Address',
    }),
    txt('Address Value', 'address', 60, 240, 518, 60, {
      fontSize: 14,
      color: '#444',
      lineHeight: 1.5,
    }),
    shape('Sep1', 'rectangle', 60, 310, 518, 1, { backgroundColor: '#eee' }),

    txt('Emergency Label', undefined, 60, 330, 200, 28, {
      fontSize: 12,
      color: '#c62828',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Emergency Contact',
    }),
    txt('Emergency Value', 'emergency', 60, 360, 518, 35, {
      fontSize: 22,
      color: '#c62828',
      fontWeight: '800',
    }),
    shape('Sep2', 'rectangle', 60, 410, 518, 1, { backgroundColor: '#eee' }),

    txt('OrgLabel', undefined, 60, 430, 200, 28, {
      fontSize: 12,
      color: '#1565c0',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Hospital Contact',
    }),
    txt('OrgPhone', 'orgPhone', 60, 460, 518, 28, {
      fontSize: 14,
      color: '#444',
    }),
    txt('OrgEmail', 'orgEmail', 60, 495, 518, 28, {
      fontSize: 14,
      color: '#444',
    }),

    // QR
    qr('QR', 'code', 244, 620, 150),

    // Signatures
    img('Sig1', 'signature1', 60, 830, 200, 70, { objectFit: 'contain' }),
    shape('SigLine1', 'rectangle', 60, 910, 200, 1, { backgroundColor: '#ccc' }),
    txt('SigLabel1', undefined, 60, 918, 200, 22, {
      fontSize: 11,
      color: '#888',
      textAlign: 'center',
      staticText: 'Medical Director',
    }),

    img('Sig2', 'signature2', 378, 830, 200, 70, { objectFit: 'contain' }),
    shape('SigLine2', 'rectangle', 378, 910, 200, 1, { backgroundColor: '#ccc' }),
    txt('SigLabel2', undefined, 378, 918, 200, 22, {
      fontSize: 11,
      color: '#888',
      textAlign: 'center',
      staticText: 'Administrator',
    }),

    // Footer
    shape('Footer', 'rectangle', 0, 970, 638, 40, {
      backgroundColor: '#0d47a1',
    }),
    txt('Footer', 'orgName', 20, 978, 598, 25, {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 5: EVENT BADGE (Horizontal-style, conference)
// ═══════════════════════════════════════════════════════════
export const eventBadgeTemplate: CardTemplate = {
  id: 'builtin_event_badge',
  name: 'Event Badge',
  description: 'Modern vertical badge design for conferences, workshops, and events.',
  category: 'event',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // Dark gradient bg
    shape('BG', 'rectangle', 0, 0, 638, 1010, {
      gradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }),
    // Top geometric decoration
    shape('Geo1', 'circle', 450, -80, 250, 250, {
      backgroundColor: 'rgba(233, 69, 96, 0.2)',
    }),
    shape('Geo2', 'circle', -60, 750, 200, 200, {
      backgroundColor: 'rgba(233, 69, 96, 0.15)',
    }),
    // EVENT label
    shape('Event Pill', 'rounded-rect', 219, 60, 200, 40, {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    }),
    txt('Event Label', undefined, 219, 66, 200, 28, {
      fontSize: 12,
      color: '#e94560',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 4,
      staticText: 'EVENT 2025',
    }),
    // Logo
    img('Logo', 'logo', 219, 120, 200, 70, {
      objectFit: 'contain',
    }),
    // Photo
    shape('Photo Border', 'circle', 209, 240, 220, 220, {
      backgroundColor: 'rgba(233, 69, 96, 0.3)',
      borderRadius: 110,
    }),
    img('Photo', 'photo', 219, 250, 200, 200, {
      borderRadius: 100,
      objectFit: 'cover',
      borderWidth: 4,
      borderColor: '#e94560',
    }),
    // Attendee name
    txt('Name', 'name', 20, 510, 598, 55, {
      fontSize: 38,
      color: '#ffffff',
      fontWeight: '800',
      textAlign: 'center',
    }),
    // Role/Designation
    txt('Role', 'role', 20, 575, 598, 35, {
      fontSize: 18,
      color: '#e94560',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
    }),
    // Organization
    txt('Organization', undefined, 20, 620, 598, 30, {
      fontSize: 15,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '400',
      textAlign: 'center',
      staticText: 'Attendee',
    }),
    // Divider with dots
    shape('Dot1', 'circle', 289, 690, 12, 12, {
      backgroundColor: '#e94560',
      borderRadius: 6,
    }),
    shape('Dot2', 'circle', 313, 690, 12, 12, {
      backgroundColor: '#e94560',
      borderRadius: 6,
    }),
    shape('Dot3', 'circle', 337, 690, 12, 12, {
      backgroundColor: '#e94560',
      borderRadius: 6,
    }),
    // ID Code
    shape('Code BG', 'rounded-rect', 169, 740, 300, 50, {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 8,
    }),
    txt('ID Code', 'code', 169, 750, 300, 30, {
      fontSize: 18,
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 4,
    }),
    // Access level
    txt('Access', undefined, 20, 830, 598, 28, {
      fontSize: 13,
      color: 'rgba(255,255,255,0.4)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'All Access Pass',
    }),
    // Footer
    shape('Footer', 'rectangle', 0, 960, 638, 50, {
      backgroundColor: '#e94560',
    }),
    txt('Footer', 'orgName', 20, 970, 598, 30, {
      fontSize: 13,
      color: '#fff',
      textAlign: 'center',
      staticText: 'Event Organizer',
    }),
  ],
  backElements: [
    shape('Back BG', 'rectangle', 0, 0, 638, 1010, {
      gradient: 'linear-gradient(180deg, #0f3460, #1a1a2e)',
    }),
    // QR large
    qr('QR Large', 'code', 194, 100, 250),
    // Scan text
    txt('Scan Text', undefined, 20, 380, 598, 28, {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
      staticText: 'Scan for event details',
    }),
    // Info cards
    shape('InfoBG', 'rounded-rect', 50, 450, 538, 200, {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    }),
    txt('Contact Label', undefined, 80, 480, 200, 25, {
      fontSize: 12,
      color: '#e94560',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Contact',
    }),
    txt('Contact Value', 'contact', 80, 510, 478, 28, {
      fontSize: 16,
      color: '#fff',
      fontWeight: '500',
    }),
    txt('Emergency Label', undefined, 80, 555, 200, 25, {
      fontSize: 12,
      color: '#e94560',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Emergency',
    }),
    txt('Emergency Value', 'emergency', 80, 585, 478, 28, {
      fontSize: 16,
      color: '#fff',
      fontWeight: '500',
    }),
    // Terms
    txt('Terms', undefined, 50, 700, 538, 120, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.3)',
      lineHeight: 1.6,
      staticText:
        'This badge must be worn at all times during the event. Lost badges cannot be replaced. For assistance, contact the event help desk or call the emergency number above.',
    }),
    // Footer
    shape('Footer', 'rectangle', 0, 960, 638, 50, {
      backgroundColor: '#e94560',
    }),
    txt('Footer', 'orgName', 20, 970, 598, 30, {
      fontSize: 12,
      color: '#fff',
      textAlign: 'center',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 6: MODERN GRADIENT
// ═══════════════════════════════════════════════════════════
export const modernGradientTemplate: CardTemplate = {
  id: 'builtin_modern_gradient',
  name: 'Modern Gradient',
  description: 'Vibrant gradient design with modern typography and glass-morphism effects.',
  category: 'corporate',
  cardWidth: 638,
  cardHeight: 1010,
  isBuiltIn: true,
  frontElements: [
    // Gradient background
    shape('BG', 'rectangle', 0, 0, 638, 1010, {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }),
    // Glass card effect
    shape('Glass Card', 'rounded-rect', 30, 200, 578, 780, {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      shadow: '0 8px 32px rgba(0,0,0,0.1)',
    }),
    // Top section with org info
    txt('Org Name', 'orgName', 50, 230, 538, 40, {
      fontSize: 22,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
      staticText: 'Your Company',
    }),
    // Logo
    img('Logo', 'logo', 219, 290, 200, 80, {
      objectFit: 'contain',
    }),
    // Photo
    shape('Photo Ring', 'circle', 209, 400, 220, 220, {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 110,
      shadow: '0 0 0 4px rgba(255,255,255,0.3)',
    }),
    img('Photo', 'photo', 224, 415, 190, 190, {
      borderRadius: 95,
      objectFit: 'cover',
      borderWidth: 4,
      borderColor: '#ffffff',
    }),
    // Name
    txt('Name', 'name', 60, 660, 518, 50, {
      fontSize: 34,
      color: '#ffffff',
      fontWeight: '800',
      textAlign: 'center',
    }),
    // Role
    txt('Role', 'role', 60, 720, 518, 35, {
      fontSize: 18,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Code badge
    shape('Code Badge', 'rounded-rect', 194, 780, 250, 45, {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 22,
    }),
    txt('Code', 'code', 194, 788, 250, 30, {
      fontSize: 16,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 2,
    }),
    // Dates
    txt('Issued', 'issued', 60, 860, 230, 25, {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
    }),
    txt('Valid', 'valid', 348, 860, 230, 25, {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
    }),
    // Decorative circles
    shape('Deco1', 'circle', 500, 80, 80, 80, {
      backgroundColor: 'rgba(255,255,255,0.1)',
    }),
    shape('Deco2', 'circle', 40, 100, 50, 50, {
      backgroundColor: 'rgba(255,255,255,0.08)',
    }),
  ],
  backElements: [
    shape('Back BG', 'rectangle', 0, 0, 638, 1010, {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }),
    // Glass card
    shape('Glass Card', 'rounded-rect', 30, 80, 578, 850, {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    }),
    txt('Info Title', undefined, 60, 110, 518, 35, {
      fontSize: 18,
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
      staticText: 'Information',
    }),
    // Info fields with glass items
    shape('Item1', 'rounded-rect', 60, 170, 518, 60, {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
    }),
    txt('DOB Label', undefined, 80, 180, 200, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Date of Birth',
    }),
    txt('DOB', 'dob', 80, 202, 478, 25, {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    }),

    shape('Item2', 'rounded-rect', 60, 250, 518, 60, {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
    }),
    txt('Blood Label', undefined, 80, 260, 200, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Blood Group',
    }),
    txt('Blood', 'blood', 80, 282, 478, 25, {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    }),

    shape('Item3', 'rounded-rect', 60, 330, 518, 60, {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
    }),
    txt('Contact Label', undefined, 80, 340, 200, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Contact',
    }),
    txt('Contact', 'contact', 80, 362, 478, 25, {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    }),

    shape('Item4', 'rounded-rect', 60, 410, 518, 80, {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
    }),
    txt('Address Label', undefined, 80, 420, 200, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Address',
    }),
    txt('Address', 'address', 80, 442, 478, 45, {
      fontSize: 14,
      color: '#fff',
      fontWeight: '500',
      lineHeight: 1.4,
    }),

    // Emergency
    shape('Emerg', 'rounded-rect', 60, 520, 518, 80, {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    }),
    txt('Emerg Label', undefined, 80, 530, 478, 20, {
      fontSize: 10,
      color: '#fca5a5',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Emergency Contact',
    }),
    txt('Emerg', 'emergency', 80, 555, 478, 30, {
      fontSize: 20,
      color: '#fff',
      fontWeight: '800',
    }),

    // QR
    qr('QR', 'code', 244, 640, 150),

    // Signatures
    img('Sig1', 'signature1', 60, 840, 200, 60, { objectFit: 'contain' }),
    shape('SigLine1', 'rectangle', 60, 910, 200, 1, {
      backgroundColor: 'rgba(255,255,255,0.3)',
    }),
    txt('SigLabel1', undefined, 60, 918, 200, 22, {
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      staticText: 'Manager',
    }),
    img('Sig2', 'signature2', 378, 840, 200, 60, { objectFit: 'contain' }),
    shape('SigLine2', 'rectangle', 378, 910, 200, 1, {
      backgroundColor: 'rgba(255,255,255,0.3)',
    }),
    txt('SigLabel2', undefined, 378, 918, 200, 22, {
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      staticText: 'HR Director',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE 7: HORIZONTAL CORPORATE (Landscape ID card)
// ═══════════════════════════════════════════════════════════
export const horizontalCorporateTemplate: CardTemplate = {
  id: 'builtin_horizontal_corporate',
  name: 'Horizontal Corporate',
  description: 'Professional landscape ID card with side-by-side photo and info layout.',
  category: 'corporate',
  cardWidth: 1010,
  cardHeight: 638,
  isBuiltIn: true,
  frontElements: [
    // Full background
    shape('BG', 'rectangle', 0, 0, 1010, 638, {
      backgroundColor: '#ffffff',
    }),
    // Left accent panel
    shape('Left Panel', 'rectangle', 0, 0, 360, 638, {
      gradient: 'linear-gradient(180deg, #1e3a5f 0%, #0f2439 100%)',
    }),
    // Accent stripe
    shape('Accent Stripe', 'rectangle', 360, 0, 6, 638, {
      backgroundColor: '#2ecc71',
    }),
    // Logo on left panel
    img('Company Logo', 'logo', 80, 30, 200, 70, {
      objectFit: 'contain',
    }),
    // Org name on left panel
    txt('Org Name', 'orgName', 20, 105, 320, 30, {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Photo on left panel
    shape('Photo BG', 'circle', 95, 160, 170, 170, {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 85,
    }),
    img('Employee Photo', 'photo', 105, 170, 150, 150, {
      borderRadius: 75,
      objectFit: 'cover',
      borderWidth: 3,
      borderColor: '#2ecc71',
    }),
    // Name on left panel
    txt('Full Name', 'name', 20, 355, 320, 40, {
      fontSize: 22,
      color: '#ffffff',
      fontWeight: '800',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
    }),
    // Role on left panel
    txt('Designation', 'role', 20, 400, 320, 30, {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }),
    // Employee Code on left panel
    shape('Code Badge', 'rounded-rect', 100, 450, 160, 36, {
      backgroundColor: 'rgba(46,204,113,0.2)',
      borderRadius: 18,
    }),
    txt('Employee Code', 'code', 100, 456, 160, 24, {
      fontSize: 14,
      color: '#2ecc71',
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 2,
    }),
    // Issued / Valid on left panel
    txt('Issued Label', undefined, 20, 520, 160, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'ISSUED',
    }),
    txt('Issued Date', 'issued', 20, 540, 160, 22, {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
      textAlign: 'center',
    }),
    txt('Valid Label', undefined, 180, 520, 160, 20, {
      fontSize: 10,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'VALID UNTIL',
    }),
    txt('Valid Date', 'valid', 180, 540, 160, 22, {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
      textAlign: 'center',
    }),
    // Right side — Info section
    txt('Identity Card Label', undefined, 400, 30, 580, 28, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 4,
      staticText: 'EMPLOYEE IDENTITY CARD',
    }),
    // Divider
    shape('Top Divider', 'rectangle', 400, 65, 580, 1, {
      backgroundColor: '#e2e8f0',
    }),
    // DOB
    txt('DOB Label', undefined, 400, 90, 140, 22, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Date of Birth',
    }),
    txt('DOB', 'dob', 550, 90, 420, 22, {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line1', 'rectangle', 400, 120, 580, 1, { backgroundColor: '#f1f5f9' }),
    // Blood
    txt('Blood Label', undefined, 400, 135, 140, 22, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Blood Group',
    }),
    txt('Blood', 'blood', 550, 135, 420, 22, {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line2', 'rectangle', 400, 165, 580, 1, { backgroundColor: '#f1f5f9' }),
    // Contact
    txt('Contact Label', undefined, 400, 180, 140, 22, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Contact No.',
    }),
    txt('Contact', 'contact', 550, 180, 420, 22, {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '600',
    }),
    shape('Line3', 'rectangle', 400, 210, 580, 1, { backgroundColor: '#f1f5f9' }),
    // Address
    txt('Address Label', undefined, 400, 225, 140, 22, {
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Address',
    }),
    txt('Address', 'address', 550, 225, 420, 50, {
      fontSize: 13,
      color: '#1e293b',
      fontWeight: '500',
      lineHeight: 1.4,
    }),
    shape('Line4', 'rectangle', 400, 285, 580, 1, { backgroundColor: '#f1f5f9' }),
    // Emergency
    shape('Emergency BG', 'rounded-rect', 400, 305, 580, 65, {
      backgroundColor: '#fef2f2',
      borderRadius: 10,
    }),
    txt('Emergency Title', undefined, 420, 315, 540, 20, {
      fontSize: 10,
      color: '#991b1b',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      staticText: 'Emergency Contact',
    }),
    txt('Emergency', 'emergency', 420, 338, 540, 24, {
      fontSize: 18,
      color: '#dc2626',
      fontWeight: '800',
      letterSpacing: 1,
    }),
    // QR Code
    qr('QR Code', 'code', 420, 400, 120),
    // Signatures
    img('Signature 1', 'signature1', 600, 420, 160, 60, {
      objectFit: 'contain',
    }),
    shape('Sig Line 1', 'rectangle', 600, 490, 160, 1, {
      backgroundColor: '#cbd5e1',
    }),
    txt('Sig Label 1', undefined, 600, 496, 160, 20, {
      fontSize: 10,
      color: '#94a3b8',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Authorized Signatory',
    }),
    img('Signature 2', 'signature2', 800, 420, 160, 60, {
      objectFit: 'contain',
    }),
    shape('Sig Line 2', 'rectangle', 800, 490, 160, 1, {
      backgroundColor: '#cbd5e1',
    }),
    txt('Sig Label 2', undefined, 800, 496, 160, 20, {
      fontSize: 10,
      color: '#94a3b8',
      fontWeight: '600',
      textAlign: 'center',
      staticText: 'Director',
    }),
    // Bottom bar
    shape('Bottom Bar', 'rectangle', 366, 580, 644, 58, {
      backgroundColor: '#f8fafc',
    }),
    txt('Footer Org', 'orgName', 400, 593, 580, 25, {
      fontSize: 12,
      color: '#94a3b8',
      fontWeight: '500',
      textAlign: 'center',
    }),
  ],
  backElements: [
    shape('Back BG', 'rectangle', 0, 0, 1010, 638, {
      backgroundColor: '#f8fafc',
    }),
    // Header
    shape('Back Header', 'rectangle', 0, 0, 1010, 80, {
      gradient: 'linear-gradient(90deg, #1e3a5f 0%, #0f2439 100%)',
    }),
    shape('Back Accent', 'rectangle', 0, 80, 1010, 4, {
      backgroundColor: '#2ecc71',
    }),
    txt('Back Title', undefined, 20, 25, 970, 35, {
      fontSize: 18,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 3,
      staticText: 'Terms & Conditions',
    }),
    // Terms text
    txt('Terms 1', undefined, 40, 110, 930, 30, {
      fontSize: 13,
      color: '#475569',
      fontWeight: '400',
      staticText: '1. This card is the property of the organization and must be returned upon request.',
    }),
    txt('Terms 2', undefined, 40, 150, 930, 30, {
      fontSize: 13,
      color: '#475569',
      fontWeight: '400',
      staticText: '2. If found, please return to the address mentioned below.',
    }),
    txt('Terms 3', undefined, 40, 190, 930, 30, {
      fontSize: 13,
      color: '#475569',
      fontWeight: '400',
      staticText: '3. This card is non-transferable and must be carried at all times.',
    }),
    txt('Terms 4', undefined, 40, 230, 930, 30, {
      fontSize: 13,
      color: '#475569',
      fontWeight: '400',
      staticText: '4. Any misuse of this card will result in disciplinary action.',
    }),
    // Org info block
    shape('Org Info BG', 'rounded-rect', 40, 300, 930, 120, {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      shadow: '0 2px 8px rgba(0,0,0,0.06)',
    }),
    txt('Org Name Back', 'orgName', 60, 315, 890, 30, {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '700',
      textAlign: 'center',
    }),
    txt('Org Address', 'orgAddress', 60, 350, 890, 25, {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '400',
      textAlign: 'center',
    }),
    txt('Org Contact', 'orgPhone', 60, 380, 445, 25, {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '400',
      textAlign: 'center',
    }),
    txt('Org Email', 'orgEmail', 505, 380, 445, 25, {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '400',
      textAlign: 'center',
    }),
    // QR on back
    qr('Back QR', 'code', 430, 460, 150),
    // Footer
    shape('Back Footer', 'rectangle', 0, 590, 1010, 48, {
      gradient: 'linear-gradient(90deg, #1e3a5f 0%, #0f2439 100%)',
    }),
    txt('Footer Text', 'orgWebsite', 20, 602, 970, 25, {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '500',
      textAlign: 'center',
    }),
  ],
};

// ═══════════════════════════════════════════════════════════
// Export all built-in templates
// ═══════════════════════════════════════════════════════════
export const builtInTemplates: CardTemplate[] = [
  corporateProTemplate,
  schoolClassicTemplate,
  minimalElegantTemplate,
  medicalTemplate,
  eventBadgeTemplate,
  modernGradientTemplate,
  horizontalCorporateTemplate,
];

export function getBuiltInTemplates(): CardTemplate[] {
  return builtInTemplates.map((t) => ({ ...t }));
}
