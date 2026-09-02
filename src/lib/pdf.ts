import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Automatically removes invalid Windows filename characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document.pdf';
  let clean = filename.replace(/[\\/:*?"<>|]/g, '-').trim();
  if (!clean.toLowerCase().endsWith('.pdf')) {
    clean += '.pdf';
  }
  return clean;
}

function parseL(val: string | undefined): number {
  if (!val || val === 'none') return 0;
  const v = val.trim();
  if (v.endsWith('%')) return parseFloat(v) / 100;
  return parseFloat(v) || 0;
}

function parseAB(val: string | undefined): number {
  if (!val || val === 'none') return 0;
  const v = val.trim();
  if (v.endsWith('%')) return (parseFloat(v) / 100) * 0.4;
  return parseFloat(v) || 0;
}

function parseHue(val: string | undefined): number {
  if (!val || val === 'none') return 0;
  const v = val.trim();
  if (v.endsWith('deg')) return parseFloat(v);
  if (v.endsWith('rad')) return (parseFloat(v) * 180) / Math.PI;
  if (v.endsWith('turn')) return parseFloat(v) * 360;
  if (v.endsWith('grad')) return (parseFloat(v) * 360) / 400;
  return parseFloat(v) || 0;
}

function parseAlpha(val: string | undefined): number {
  if (!val || val === 'none') return 1;
  const v = val.trim();
  if (v.endsWith('%')) return parseFloat(v) / 100;
  const parsed = parseFloat(v);
  return isNaN(parsed) ? 1 : parsed;
}

function oklabToRgbStr(L: number, labA: number, labB: number, A: number): string {
  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.291485548 * labB;

  const l = Math.max(0, l_) ** 3;
  const m = Math.max(0, m_) ** 3;
  const s = Math.max(0, s_) ** 3;

  const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toGamma = (c: number) => {
    if (c <= 0) return 0;
    if (c >= 1) return 255;
    const cGamma = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(cGamma * 255)));
  };

  const r = toGamma(rLinear);
  const g = toGamma(gLinear);
  const b = toGamma(bLinear);

  if (A < 1) {
    return `rgba(${r}, ${g}, ${b}, ${A.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str;
  return str.replace(/oklch\(((?:[^()]+|\([^()]*\))*)\)/gi, (fullMatch, content: string) => {
    try {
      let rawL = '';
      let rawC = '';
      let rawH = '';
      let rawAlpha: string | undefined;

      if (content.includes('/')) {
        const slashParts = content.split('/');
        const leftParts = slashParts[0].trim().split(/[\s,]+/);
        rawL = leftParts[0];
        rawC = leftParts[1];
        rawH = leftParts[2];
        rawAlpha = slashParts[1].trim();
      } else {
        const parts = content.trim().split(/[\s,]+/);
        rawL = parts[0];
        rawC = parts[1];
        rawH = parts[2];
        rawAlpha = parts[3];
      }

      if (rawL !== undefined && rawC !== undefined && rawH !== undefined) {
        const L = parseL(rawL);
        const C = parseAB(rawC);
        const H = parseHue(rawH);
        const A = rawAlpha !== undefined ? parseAlpha(rawAlpha) : 1;

        const hRad = (H * Math.PI) / 180;
        const labA = C * Math.cos(hRad);
        const labB = C * Math.sin(hRad);

        return oklabToRgbStr(L, labA, labB, A);
      }
    } catch {
      // ignore
    }
    return 'rgb(120, 120, 120)';
  });
}

export function replaceOklabInString(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklab')) return str;
  return str.replace(/oklab\(((?:[^()]+|\([^()]*\))*)\)/gi, (fullMatch, content: string) => {
    try {
      let rawL = '';
      let rawA = '';
      let rawB = '';
      let rawAlpha: string | undefined;

      if (content.includes('/')) {
        const slashParts = content.split('/');
        const leftParts = slashParts[0].trim().split(/[\s,]+/);
        rawL = leftParts[0];
        rawA = leftParts[1];
        rawB = leftParts[2];
        rawAlpha = slashParts[1].trim();
      } else {
        const parts = content.trim().split(/[\s,]+/);
        rawL = parts[0];
        rawA = parts[1];
        rawB = parts[2];
        rawAlpha = parts[3];
      }

      if (rawL !== undefined && rawA !== undefined && rawB !== undefined) {
        const L = parseL(rawL);
        const labA = parseAB(rawA);
        const labB = parseAB(rawB);
        const A = rawAlpha !== undefined ? parseAlpha(rawAlpha) : 1;

        return oklabToRgbStr(L, labA, labB, A);
      }
    } catch {
      // ignore
    }
    return 'rgb(120, 120, 120)';
  });
}

export function replaceUnsupportedColorsInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  let res = str;
  if (res.includes('oklch')) res = replaceOklchInString(res);
  if (res.includes('oklab')) res = replaceOklabInString(res);
  if (res.includes('color-mix')) {
    res = res.replace(/color-mix\((?:[^()]+|\([^()]*\))*\)/gi, 'rgb(120, 120, 120)');
  }
  if (res.includes('color(')) {
    res = res.replace(/color\((?:[^()]+|\([^()]*\))*\)/gi, 'rgb(120, 120, 120)');
  }

  if (res.includes('oklab')) {
    res = res.replace(/oklab\([^)]*\)/gi, 'rgb(120, 120, 120)');
  }
  if (res.includes('oklch')) {
    res = res.replace(/oklch\([^)]*\)/gi, 'rgb(120, 120, 120)');
  }
  return res;
}

function createSafeStyleProxy(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(target, property) {
      if (property === 'getPropertyValue') {
        return (propName: string) => {
          const val = target.getPropertyValue(propName);
          return replaceUnsupportedColorsInString(val);
        };
      }
      const val = Reflect.get(target, property, target);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      if (
        typeof val === 'string' &&
        (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix') || val.includes('color('))
      ) {
        return replaceUnsupportedColorsInString(val);
      }
      return val;
    },
  });
}

export interface PdfResult {
  success: boolean;
  message: string;
  cancelled?: boolean;
}

/**
 * Downloads/saves a high-quality PDF of the specified HTML element.
 * Supports native file picker selection when permitted, falling back to browser download.
 */
export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: number; // margin in mm (default: 10)
  showPageNumbers?: boolean;
}

/**
 * Downloads/saves a high-quality PDF of the specified HTML element strictly in standard A4 Paper Size (210mm x 297mm).
 * Guaranteed standard A4 paper dimensions, non-cutting margins, multi-page continuation, and page numbering.
 */
export async function downloadPdfFromElement(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions
): Promise<PdfResult> {
  if (!element) {
    return { success: false, message: 'Unable to generate PDF: Element not found.' };
  }

  const cleanFilename = sanitizeFilename(filename);
  const orientation = options?.orientation || 'portrait';
  const margin = options?.margin !== undefined ? options?.margin : 10; // 10mm standard A4 margin
  const showPageNumbers = options?.showPageNumbers !== false;

  // Standard A4 Dimensions in millimeters
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  // 1. Sanitize all host <style> tags temporarily
  const styleElements = Array.from(document.querySelectorAll('style'));
  const originalStyles: { el: HTMLStyleElement; text: string }[] = [];

  styleElements.forEach((el) => {
    const text = el.textContent || '';
    if (text.includes('oklch') || text.includes('oklab') || text.includes('color-mix') || text.includes('color(')) {
      originalStyles.push({ el, text });
      el.textContent = replaceUnsupportedColorsInString(text);
    }
  });

  // 2. Patch window.getComputedStyle on main window temporarily
  const origMainGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
    const style = origMainGetComputedStyle(elt, pseudoElt);
    return createSafeStyleProxy(style);
  };

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc: Document) => {
        // A. Convert all <style> tags in cloned document
        const clonedStyles = Array.from(clonedDoc.querySelectorAll('style'));
        clonedStyles.forEach((oldStyle) => {
          const text = oldStyle.textContent || '';
          if (text.includes('oklch') || text.includes('oklab') || text.includes('color-mix') || text.includes('color(')) {
            const newCss = replaceUnsupportedColorsInString(text);
            const newStyle = clonedDoc.createElement('style');
            newStyle.textContent = newCss;
            if (oldStyle.parentNode) {
              oldStyle.parentNode.replaceChild(newStyle, oldStyle);
            }
          }
        });

        // B. Intercept getComputedStyle on cloned window
        const win = clonedDoc.defaultView || window;
        if (win && win.getComputedStyle) {
          const origClonedGetComputedStyle = win.getComputedStyle.bind(win);
          win.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
            const style = origClonedGetComputedStyle(elt, pseudoElt);
            return createSafeStyleProxy(style);
          };
        }

        // C. Clean inline style attributes and attributes on all elements in clonedDoc
        const allNodes = clonedDoc.querySelectorAll('*');
        allNodes.forEach((node) => {
          const htmlEl = node as HTMLElement;
          if (htmlEl.style && htmlEl.style.cssText) {
            if (
              htmlEl.style.cssText.includes('oklch') ||
              htmlEl.style.cssText.includes('oklab') ||
              htmlEl.style.cssText.includes('color-mix')
            ) {
              htmlEl.style.cssText = replaceUnsupportedColorsInString(htmlEl.style.cssText);
            }
          }
          if (htmlEl.attributes) {
            Array.from(htmlEl.attributes).forEach((attr) => {
              if (
                attr.value &&
                (attr.value.includes('oklch') || attr.value.includes('oklab') || attr.value.includes('color-mix'))
              ) {
                attr.value = replaceUnsupportedColorsInString(attr.value);
              }
            });
          }
        });
      },
    });

    // Create jsPDF strictly in A4 (210mm x 297mm)
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;
    const totalHeightInMm = (canvasHeightPx * printableWidth) / canvasWidthPx;

    // Single-page layout optimization (e.g., standard Invoices & Expense Vouchers)
    // If it fits within 1 page (or with slight scaling up to 10%), fit cleanly on 1 A4 page
    if (totalHeightInMm <= printableHeight + 8) {
      let renderWidth = printableWidth;
      let renderHeight = totalHeightInMm;
      if (renderHeight > printableHeight) {
        const scaleFactor = printableHeight / renderHeight;
        renderWidth = renderWidth * scaleFactor;
        renderHeight = printableHeight;
      }
      const xOffset = margin + (printableWidth - renderWidth) / 2;
      const yOffset = margin;
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
    } else {
      // Multi-Page Precision Slicing for long documents
      // Calculate how many canvas pixels correspond to one printable A4 page
      const sliceHeightPx = Math.floor((printableHeight / printableWidth) * canvasWidthPx);
      const totalPages = Math.ceil(canvasHeightPx / sliceHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage('a4', orientation);
        }

        const sourceY = page * sliceHeightPx;
        const currentSliceHeightPx = Math.min(sliceHeightPx, canvasHeightPx - sourceY);

        // Render current slice onto an offscreen canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidthPx;
        sliceCanvas.height = currentSliceHeightPx;
        const sliceCtx = sliceCanvas.getContext('2d');

        if (sliceCtx) {
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, canvasWidthPx, currentSliceHeightPx);
          sliceCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvasWidthPx,
            currentSliceHeightPx,
            0,
            0,
            canvasWidthPx,
            currentSliceHeightPx
          );

          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const sliceHeightMm = (currentSliceHeightPx * printableWidth) / canvasWidthPx;

          pdf.addImage(
            sliceImgData,
            'PNG',
            margin,
            margin,
            printableWidth,
            sliceHeightMm,
            undefined,
            'FAST'
          );

          // Add Page Footer
          if (showPageNumbers && totalPages > 1) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.text(
              `Page ${page + 1} of ${totalPages}`,
              pageWidth - margin,
              pageHeight - 4.5,
              { align: 'right' }
            );
          }
        }
      }
    }

    // Try modern File System Access API if supported & permitted
    if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const picker = (window as any).showSaveFilePicker.bind(window);
        const handle = await picker({
          suggestedName: cleanFilename,
          types: [
            {
              description: 'PDF Document (A4)',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        const pdfBlob = pdf.output('blob');
        await writable.write(pdfBlob);
        await writable.close();
        return { success: true, message: `Saved "${cleanFilename}" (A4 PDF) successfully!` };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, message: 'File save cancelled.', cancelled: true };
        }
        // Fallback to standard download if picker throws permission error
        pdf.save(cleanFilename);
        return { success: true, message: `Generated and downloaded "${cleanFilename}" (A4 PDF)!` };
      }
    } else {
      pdf.save(cleanFilename);
      return { success: true, message: `Generated and downloaded "${cleanFilename}" (A4 PDF)!` };
    }
  } catch (error) {
    console.error('Failed to generate A4 PDF:', error);
    return {
      success: false,
      message: 'Unable to generate A4 PDF. Please try again.',
    };
  } finally {
    // Restore window.getComputedStyle
    window.getComputedStyle = origMainGetComputedStyle;
    // Restore original <style> content in host document
    originalStyles.forEach(({ el, text }) => {
      el.textContent = text;
    });
  }
}
