// PDF of the patching area: boards, holes, labels, pins and cables as vector, module art as embedded images
import type { jsPDF } from 'jspdf';

export interface PatchPdfOptions {
  container: HTMLElement; // the main patching container
  boardIds: string[];
  scale: number; // CSS transform scale of the patch area
  title: string;
}

interface Box { x: number; y: number; w: number; h: number }
interface Art { data: string; format: 'JPEG' | 'PNG'; width: number; height: number }

const MARGIN = 24;
const TITLE_HEIGHT = 40;

// Decode a module image once; JPEG for opaque art, PNG where any pixel is transparent
async function loadArt(url: string): Promise<Art> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let transparent = false;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 255) { transparent = true; break; }
  }
  return transparent
    ? { data: canvas.toDataURL('image/png'), format: 'PNG', width, height }
    : { data: canvas.toDataURL('image/jpeg', 0.9), format: 'JPEG', width, height };
}

// Make a cloned svg render like the screen with svg2pdf: Helvetica text, dominant-baseline honored
function prepareClone(clone: SVGSVGElement) {
  clone.setAttribute('font-family', 'helvetica');
  clone.querySelectorAll('text').forEach(text => {
    const baseline = text.getAttribute('dominant-baseline');
    if (baseline && !text.hasAttribute('alignment-baseline')) text.setAttribute('alignment-baseline', baseline);
  });
}

function cssColor(value: string, fallback: [number, number, number]): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : fallback;
}

export async function buildPatchPdf({ container, boardIds, scale, title }: PatchPdfOptions): Promise<jsPDF | null> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  const containerRect = container.getBoundingClientRect();
  const boards = boardIds.flatMap(id => {
    const holder = document.getElementById(`breadboard-svg-${id}`);
    const svg = holder?.querySelector(':scope > svg') as SVGSVGElement | null;
    const panel = holder?.parentElement;
    return svg && panel ? [{ svg, panel }] : [];
  });
  // Cable layer: the svg directly in a child div of the container (the debug overlay holds none)
  const cableSvg = container.querySelector(':scope > div > svg') as SVGSVGElement | null;

  // On-screen bounds of the patch: board panels and drawn cables
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const include = (r: DOMRect, pad = 0) => {
    left = Math.min(left, r.left - pad);
    top = Math.min(top, r.top - pad);
    right = Math.max(right, r.right + pad);
    bottom = Math.max(bottom, r.bottom + pad);
  };
  boards.forEach(({ panel }) => include(panel.getBoundingClientRect()));
  cableSvg?.querySelectorAll('path').forEach(path => include(path.getBoundingClientRect(), 6 * scale));
  if (!isFinite(left)) return null;
  left = Math.max(left, containerRect.left);
  top = Math.max(top, containerRect.top);
  right = Math.min(right, containerRect.right);
  bottom = Math.min(bottom, containerRect.bottom);

  // Page in CSS px at full size: margin, title, patch
  const width = (right - left) / scale;
  const height = (bottom - top) / scale;
  const pageWidth = width + 2 * MARGIN;
  const pageHeight = height + TITLE_HEIGHT + 2 * MARGIN;
  const doc = new jsPDF({
    orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pageWidth, pageHeight],
    hotfixes: ['px_scaling'],
    compress: true
  });
  doc.setFillColor(24, 24, 24);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); // 20px
  doc.text(title, MARGIN, MARGIN, { baseline: 'top' });

  // Screen rect to page px: offset from the patch bounds, undo the patch scale
  const toPage = (r: DOMRect): Box => ({
    x: MARGIN + (r.left - left) / scale,
    y: MARGIN + TITLE_HEIGHT + (r.top - top) / scale,
    w: r.width / scale,
    h: r.height / scale
  });
  const drawSvg = (clone: SVGSVGElement, box: Box) => {
    prepareClone(clone);
    return svg2pdf(clone, doc, { x: box.x, y: box.y, width: box.w, height: box.h });
  };
  const art = new Map<string, Promise<Art | null>>();
  const artFor = (url: string) => {
    let entry = art.get(url);
    if (!entry) {
      entry = loadArt(url).catch(error => { console.error('Module image not embedded:', url, error); return null; });
      art.set(url, entry);
    }
    return entry;
  };

  // Keep everything inside the patch bounds, as the cropped screen image did
  doc.saveGraphicsState();
  doc.rect(MARGIN, MARGIN + TITLE_HEIGHT, width, height, null);
  doc.clip();
  doc.discardPath();

  for (const { svg, panel } of boards) {
    // Board panel: rounded background box
    const panelBox = toPage(panel.getBoundingClientRect());
    const panelStyle = getComputedStyle(panel);
    const radius = parseFloat(panelStyle.borderTopLeftRadius) || 0;
    doc.setFillColor(...cssColor(panelStyle.backgroundColor, [34, 34, 34]));
    doc.roundedRect(panelBox.x, panelBox.y, panelBox.w, panelBox.h, radius, radius, 'F');

    // Grid, holes and module labels, without the modules
    const boardClone = svg.cloneNode(true) as SVGSVGElement;
    boardClone.querySelectorAll('foreignObject').forEach(node => node.remove());
    await drawSvg(boardClone, toPage(svg.getBoundingClientRect()));

    // Modules: panel art as an image, then knobs, switches and pins as vector over it
    for (const moduleSvg of svg.querySelectorAll<SVGSVGElement>(':scope > foreignObject > div > svg')) {
      const image = moduleSvg.querySelector('image');
      const href = image?.getAttribute('href') || image?.getAttribute('xlink:href');
      if (image && href) {
        const url = new URL(href, document.baseURI).href;
        const loaded = await artFor(url);
        if (loaded) {
          // preserveAspectRatio xMidYMid meet inside the image box
          const box = toPage(image.getBoundingClientRect());
          const fit = Math.min(box.w / loaded.width, box.h / loaded.height);
          const w = loaded.width * fit;
          const h = loaded.height * fit;
          doc.addImage(loaded.data, loaded.format, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h, url, 'SLOW');
        }
      }
      const moduleClone = moduleSvg.cloneNode(true) as SVGSVGElement;
      moduleClone.querySelectorAll('image').forEach(node => node.remove());
      // Its user units are its width/height attributes; the board's viewBox and the patch scale act on top
      moduleClone.setAttribute('viewBox', `0 0 ${parseFloat(moduleSvg.getAttribute('width') || '0')} ${parseFloat(moduleSvg.getAttribute('height') || '0')}`);
      await drawSvg(moduleClone, toPage(moduleSvg.getBoundingClientRect()));
    }
  }

  // Cables on top; the layer is not scaled by CSS, its own group carries the scale
  if (cableSvg) {
    const rect = cableSvg.getBoundingClientRect();
    const cableClone = cableSvg.cloneNode(true) as SVGSVGElement;
    cableClone.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    await drawSvg(cableClone, toPage(rect));
  }

  doc.restoreGraphicsState();
  return doc;
}
