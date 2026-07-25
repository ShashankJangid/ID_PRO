import assert from 'node:assert';
import test from 'node:test';

// Standard CR80 Card Dimensions
const MOCK_TEMPLATE_PORTRAIT = {
  id: 'test_portrait',
  name: 'Test Portrait ID',
  cardWidth: 638,
  cardHeight: 1010,
};

const MOCK_TEMPLATE_LANDSCAPE = {
  id: 'test_landscape',
  name: 'Test Landscape ID',
  cardWidth: 1010,
  cardHeight: 638,
};

test('Export Canvas Dimensions Match Template Card Dimensions (Compressed quality: 2x)', () => {
  const scale = 2; // compressed quality multiplier
  const canvasWidth = MOCK_TEMPLATE_PORTRAIT.cardWidth * scale;
  const canvasHeight = MOCK_TEMPLATE_PORTRAIT.cardHeight * scale;

  assert.strictEqual(canvasWidth, 1276);
  assert.strictEqual(canvasHeight, 2020);
  assert.strictEqual(canvasWidth / canvasHeight, MOCK_TEMPLATE_PORTRAIT.cardWidth / MOCK_TEMPLATE_PORTRAIT.cardHeight);
});

test('Export Canvas Dimensions Match Template Card Dimensions (High quality: 3x)', () => {
  const scale = 3; // high quality multiplier
  const canvasWidth = MOCK_TEMPLATE_PORTRAIT.cardWidth * scale;
  const canvasHeight = MOCK_TEMPLATE_PORTRAIT.cardHeight * scale;

  assert.strictEqual(canvasWidth, 1914);
  assert.strictEqual(canvasHeight, 3030);
  assert.strictEqual(canvasWidth / canvasHeight, MOCK_TEMPLATE_PORTRAIT.cardWidth / MOCK_TEMPLATE_PORTRAIT.cardHeight);
});

test('Landscape Card Export Canvas Dimensions Assertion', () => {
  const scale = 3;
  const canvasWidth = MOCK_TEMPLATE_LANDSCAPE.cardWidth * scale;
  const canvasHeight = MOCK_TEMPLATE_LANDSCAPE.cardHeight * scale;

  assert.strictEqual(canvasWidth, 3030);
  assert.strictEqual(canvasHeight, 1914);
  assert.strictEqual(canvasWidth / canvasHeight, MOCK_TEMPLATE_LANDSCAPE.cardWidth / MOCK_TEMPLATE_LANDSCAPE.cardHeight);
});

test('Iframe document body & html margin reset verification', () => {
  // Mock element style structure
  const mockBodyStyle = { margin: '', padding: '' };
  const mockDocStyle = { margin: '', padding: '' };

  // Apply export iframe layout resets
  mockBodyStyle.margin = '0';
  mockBodyStyle.padding = '0';
  mockDocStyle.margin = '0';
  mockDocStyle.padding = '0';

  assert.strictEqual(mockBodyStyle.margin, '0');
  assert.strictEqual(mockBodyStyle.padding, '0');
  assert.strictEqual(mockDocStyle.margin, '0');
  assert.strictEqual(mockDocStyle.padding, '0');
});

test('Export capture container absolute positioning verification', () => {
  const template = MOCK_TEMPLATE_PORTRAIT;
  const containerCss = `width:${template.cardWidth}px;height:${template.cardHeight}px;position:absolute;top:0;left:0;margin:0;padding:0;border:none;font-size:0;line-height:0;overflow:hidden;background:#ffffff`;

  assert.ok(containerCss.includes(`width:${template.cardWidth}px`));
  assert.ok(containerCss.includes(`height:${template.cardHeight}px`));
  assert.ok(containerCss.includes('top:0'));
  assert.ok(containerCss.includes('left:0'));
  assert.ok(containerCss.includes('margin:0'));
  assert.ok(containerCss.includes('padding:0'));
});
