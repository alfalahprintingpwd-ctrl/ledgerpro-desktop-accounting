import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Expense, BusinessProfile } from '../types';
import { formatCurrency, formatDate, formatDateTimeLocal, getSystemTimeZone } from './utils';
import { sanitizeFilename } from './pdf';

export interface ExcelReportData {
  reportType: 'Daily' | 'Monthly' | 'Yearly';
  periodTitle: string; // e.g. "Wednesday, 19-Aug-2026" or "August 2026" or "Year 2026"
  businessProfile: BusinessProfile | null;
  currencySymbol?: string;
  orientation?: 'portrait' | 'landscape'; // Default: 'portrait' (strictly standard A4)

  // Top Summary Values
  totalSale: number;
  totalExpense: number;
  availableMoney: number;
  cashBalance: number;
  bankBalance: number;

  // Detail Lists
  transactions: Transaction[];
  expenses: Expense[];

  // Optional closing balances / notes
  closingCash?: number;
  closingBank?: number;
}

/**
 * Generates a clean, professional accounting report PDF strictly in standard A4 Paper Size (210mm x 297mm).
 * Guaranteed standard A4 paper dimensions, auto-pagination, repeating headers, wrapped text, and multi-page continuation.
 */
export async function generateExcelReportPdf(
  data: ExcelReportData,
  filename?: string
): Promise<{ success: boolean; message: string; cancelled?: boolean }> {
  try {
    const currency = data.currencySymbol || data.businessProfile?.currencySymbol || 'Rs. ';
    const cleanFilename = sanitizeFilename(
      filename ||
        `${data.reportType}-Report-${data.periodTitle.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
    );

    const orientation = data.orientation || 'portrait';
    const isLandscape = orientation === 'landscape';

    // Standard A4 Dimensions in millimeters:
    // Portrait: 210 mm x 297 mm
    // Landscape: 297 mm x 210 mm
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 12; // 12mm standard margin
    const contentWidth = pageWidth - margin * 2; // 186mm in Portrait, 273mm in Landscape

    let currentY = margin;

    // -------------------------------------------------------------
    // 1. BUSINESS HEADER & REPORT TITLE
    // -------------------------------------------------------------
    const bName = data.businessProfile?.name || 'LedgerPro Accounting & Invoicing';
    const bAddress = data.businessProfile?.address || '';
    const bPhone = data.businessProfile?.phone || '';
    const bTax = data.businessProfile?.taxRegistrationNumber
      ? `NTN/TRN: ${data.businessProfile.taxRegistrationNumber}`
      : '';

    // Business Header Line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 15 : 13);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(bName.toUpperCase(), margin, currentY + 5);

    // Report Type & Period Badge (Right-aligned)
    doc.setFontSize(isLandscape ? 11 : 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    const reportTitleText = `${data.reportType.toUpperCase()} FINANCIAL STATEMENT (A4)`;
    doc.text(reportTitleText, pageWidth - margin, currentY + 5, { align: 'right' });

    currentY += 8;

    // Sub-header details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isLandscape ? 8.5 : 7.5);
    doc.setTextColor(71, 85, 105); // slate-600

    const contactLine = [bAddress, bPhone, bTax].filter(Boolean).join(' • ');
    if (contactLine) {
      doc.text(contactLine, margin, currentY + 3);
    }

    const timeZone = getSystemTimeZone();
    const generatedTimestamp = `Period: ${data.periodTitle}  |  Generated: ${formatDateTimeLocal(
      new Date().toISOString()
    )} (${timeZone})`;
    doc.text(generatedTimestamp, pageWidth - margin, currentY + 3, { align: 'right' });

    currentY += 6;

    // Solid Excel-style Divider
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 4;

    // -------------------------------------------------------------
    // 2. EXCEL KPI SUMMARY CARDS
    // -------------------------------------------------------------
    const summaryBoxes = [
      {
        title: 'TOTAL SALE',
        amount: data.totalSale,
        color: [29, 78, 216], // blue-700
        bgColor: [239, 246, 255], // blue-50
        borderColor: [191, 219, 254], // blue-200
      },
      {
        title: 'TOTAL EXPENSE',
        amount: data.totalExpense,
        color: [190, 18, 60], // rose-700
        bgColor: [255, 241, 242], // rose-50
        borderColor: [254, 205, 211], // rose-200
      },
      {
        title: 'AVAILABLE MONEY',
        amount: data.availableMoney,
        color: [4, 120, 87], // emerald-700
        bgColor: [236, 253, 245], // emerald-50
        borderColor: [167, 243, 208], // emerald-200
      },
      {
        title: 'CASH BALANCE',
        amount: data.cashBalance,
        color: [30, 41, 59], // slate-800
        bgColor: [248, 250, 252], // slate-50
        borderColor: [203, 213, 225], // slate-300
      },
      {
        title: 'BANK BALANCE',
        amount: data.bankBalance,
        color: [30, 41, 59], // slate-800
        bgColor: [248, 250, 252], // slate-50
        borderColor: [203, 213, 225], // slate-300
      },
    ];

    const boxGap = isLandscape ? 3.5 : 2;
    const numBoxes = summaryBoxes.length;
    const boxWidth = (contentWidth - boxGap * (numBoxes - 1)) / numBoxes;
    const boxHeight = isLandscape ? 16 : 14.5;

    summaryBoxes.forEach((box, index) => {
      const boxX = margin + index * (boxWidth + boxGap);
      const boxY = currentY;

      // Draw Box Border & Background
      doc.setFillColor(box.bgColor[0], box.bgColor[1], box.bgColor[2]);
      doc.setDrawColor(box.borderColor[0], box.borderColor[1], box.borderColor[2]);
      doc.setLineWidth(0.35);
      doc.rect(boxX, boxY, boxWidth, boxHeight, 'FD');

      // Top Title Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isLandscape ? 7.5 : 6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(box.title, boxX + boxWidth / 2, boxY + 4, { align: 'center' });

      // Separator inside card
      doc.setDrawColor(box.borderColor[0], box.borderColor[1], box.borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(boxX + 2, boxY + 5.5, boxX + boxWidth - 2, boxY + 5.5);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isLandscape ? 9.5 : 8);
      doc.setTextColor(box.color[0], box.color[1], box.color[2]);
      const formattedAmt = formatCurrency(box.amount, currency);
      doc.text(formattedAmt, boxX + boxWidth / 2, boxY + (isLandscape ? 12 : 11), { align: 'center' });
    });

    currentY += boxHeight + 5;

    // -------------------------------------------------------------
    // 3. SALES DETAILS TABLE (Excel-Style Table)
    // -------------------------------------------------------------
    const activeSales = (data.transactions || []).filter((t) => !t.isVoided && t.status !== 'voided');
    const totalSalesBill = activeSales.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
    const totalSalesReceived = activeSales.reduce((sum, t) => sum + (t.totalReceived || 0), 0);
    const totalSalesPending = activeSales.reduce((sum, t) => sum + (t.pendingAmount || 0), 0);

    const salesTableBody = activeSales.map((tx) => {
      const invoiceNo =
        tx.invoiceNumber ||
        `INV-${(tx.id || '').slice(-4).toUpperCase() || '0001'}`;

      let workDetail = '-';
      if (tx.items && tx.items.length > 0) {
        workDetail = tx.items
          .map((i) => `${i.name || 'Item'} (x${i.quantity || 1})`)
          .join(', ');
      } else if (tx.notes) {
        workDetail = tx.notes;
      }

      return [
        formatDate(tx.date),
        invoiceNo,
        tx.customerName || 'Walk-in Customer',
        tx.customerPhone || '-',
        workDetail,
        formatCurrency(tx.grandTotal || 0, currency),
        formatCurrency(tx.totalReceived || 0, currency),
        formatCurrency(tx.pendingAmount || 0, currency),
      ];
    });

    // Column Width Calculations for Portrait (186mm total) vs Landscape (273mm total)
    const salesColumnStyles = isLandscape
      ? {
          0: { cellWidth: 22, halign: 'center' as const }, // Date
          1: { cellWidth: 24, halign: 'center' as const, fontStyle: 'bold' as const }, // Invoice No
          2: { cellWidth: 42, halign: 'left' as const, fontStyle: 'bold' as const }, // Customer Name
          3: { cellWidth: 26, halign: 'left' as const }, // Contact
          4: { cellWidth: 73, halign: 'left' as const }, // Work / Product Detail
          5: { cellWidth: 28, halign: 'right' as const, fontStyle: 'bold' as const }, // Total Bill
          6: { cellWidth: 28, halign: 'right' as const, textColor: [4, 120, 87] as [number, number, number] }, // Received
          7: { cellWidth: 30, halign: 'right' as const, textColor: [190, 18, 60] as [number, number, number] }, // Pending
        }
      : {
          0: { cellWidth: 17, halign: 'center' as const }, // Date
          1: { cellWidth: 18, halign: 'center' as const, fontStyle: 'bold' as const }, // Invoice No
          2: { cellWidth: 30, halign: 'left' as const, fontStyle: 'bold' as const }, // Customer Name
          3: { cellWidth: 20, halign: 'left' as const }, // Contact
          4: { cellWidth: 47, halign: 'left' as const }, // Work / Product Detail
          5: { cellWidth: 18, halign: 'right' as const, fontStyle: 'bold' as const }, // Total Bill
          6: { cellWidth: 18, halign: 'right' as const, textColor: [4, 120, 87] as [number, number, number] }, // Received
          7: { cellWidth: 18, halign: 'right' as const, textColor: [190, 18, 60] as [number, number, number] }, // Pending
        };

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 12, top: 12 },
      tableWidth: contentWidth,
      head: [
        [
          {
            content: `SALES INVOICE RECORDS (${activeSales.length} Invoices Recorded)`,
            colSpan: 8,
            styles: {
              fillColor: [30, 41, 59], // slate-800
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: isLandscape ? 8.5 : 7.8,
              halign: 'left',
              cellPadding: 2,
            },
          },
        ],
        [
          'Date',
          'Invoice No.',
          'Customer Name',
          'Contact',
          'Work / Product Detail',
          'Total Bill',
          'Received',
          'Pending',
        ],
      ],
      body: salesTableBody,
      foot: [
        [
          {
            content: 'TOTAL SALES',
            colSpan: 5,
            styles: { halign: 'right', fontStyle: 'bold', fontSize: isLandscape ? 8.5 : 7.5 },
          },
          {
            content: formatCurrency(totalSalesBill, currency),
            styles: { halign: 'right', fontStyle: 'bold', fontSize: isLandscape ? 8.5 : 7.5, textColor: [29, 78, 216] },
          },
          {
            content: formatCurrency(totalSalesReceived, currency),
            styles: { halign: 'right', fontStyle: 'bold', fontSize: isLandscape ? 8.5 : 7.5, textColor: [4, 120, 87] },
          },
          {
            content: formatCurrency(totalSalesPending, currency),
            styles: {
              halign: 'right',
              fontStyle: 'bold',
              fontSize: isLandscape ? 8.5 : 7.5,
              textColor: totalSalesPending > 0 ? [190, 18, 60] : [71, 85, 105],
            },
          },
        ],
      ],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: isLandscape ? 7.8 : 7,
        cellPadding: 1.8,
        lineColor: [148, 163, 184], // slate-400
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: isLandscape ? 8 : 7.2,
        halign: 'center',
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      footStyles: {
        fillColor: [241, 245, 249], // slate-100
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: isLandscape ? 8.5 : 7.5,
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      columnStyles: salesColumnStyles,
    });

    // Get current Y position after sales table
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Check if we have enough space for the expense table header, else start on new page
    if (currentY > pageHeight - 35) {
      doc.addPage('a4', orientation);
      currentY = margin;
    }

    // -------------------------------------------------------------
    // 4. EXPENSE DETAILS TABLE (Excel-Style Table)
    // -------------------------------------------------------------
    const expensesList = data.expenses || [];
    const totalExpenseAmount = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const expenseTableBody = expensesList.map((exp) => {
      const voucherNo =
        exp.voucherNumber ||
        `EXP-${(exp.id || '').slice(-4).toUpperCase() || '0001'}`;
      const titleWithDesc =
        exp.title + (exp.description && exp.description.trim() ? `\nNote: ${exp.description.trim()}` : '');
      const paymentMethod = exp.paymentSource === 'Bank' ? 'Bank / Account' : 'Cash';
      const madeBy = exp.madeBy || '-';

      return [
        formatDate(exp.date),
        voucherNo,
        titleWithDesc,
        exp.category || 'General Expense',
        formatCurrency(exp.amount || 0, currency),
        paymentMethod,
        madeBy,
      ];
    });

    // Column Width Calculations for Portrait (186mm total) vs Landscape (273mm total)
    const expenseColumnStyles = isLandscape
      ? {
          0: { cellWidth: 22, halign: 'center' as const }, // Date
          1: { cellWidth: 26, halign: 'center' as const, fontStyle: 'bold' as const }, // Voucher No
          2: { cellWidth: 75, halign: 'left' as const }, // Title & Description
          3: { cellWidth: 38, halign: 'left' as const }, // Category
          4: { cellWidth: 32, halign: 'right' as const, fontStyle: 'bold' as const, textColor: [190, 18, 60] as [number, number, number] }, // Amount
          5: { cellWidth: 30, halign: 'center' as const }, // Payment Method
          6: { cellWidth: 50, halign: 'left' as const, fontStyle: 'bold' as const, textColor: [30, 41, 59] as [number, number, number] }, // Expense Made By
        }
      : {
          0: { cellWidth: 18, halign: 'center' as const }, // Date
          1: { cellWidth: 20, halign: 'center' as const, fontStyle: 'bold' as const }, // Voucher No
          2: { cellWidth: 54, halign: 'left' as const }, // Title & Description
          3: { cellWidth: 26, halign: 'left' as const }, // Category
          4: { cellWidth: 22, halign: 'right' as const, fontStyle: 'bold' as const, textColor: [190, 18, 60] as [number, number, number] }, // Amount
          5: { cellWidth: 20, halign: 'center' as const }, // Payment Method
          6: { cellWidth: 26, halign: 'left' as const, fontStyle: 'bold' as const, textColor: [30, 41, 59] as [number, number, number] }, // Expense Made By
        };

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 12, top: 12 },
      tableWidth: contentWidth,
      head: [
        [
          {
            content: `EXPENSE VOUCHER RECORDS (${expensesList.length} Expenses Recorded)`,
            colSpan: 7,
            styles: {
              fillColor: [30, 41, 59], // slate-800
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: isLandscape ? 8.5 : 7.8,
              halign: 'left',
              cellPadding: 2,
            },
          },
        ],
        [
          'Date',
          'Voucher No.',
          'Expense Title & Description',
          'Category',
          'Amount',
          'Payment Method',
          'Expense Made By',
        ],
      ],
      body: expenseTableBody,
      foot: [
        [
          {
            content: 'TOTAL EXPENSES',
            colSpan: 4,
            styles: { halign: 'right', fontStyle: 'bold', fontSize: isLandscape ? 8.5 : 7.5 },
          },
          {
            content: formatCurrency(totalExpenseAmount, currency),
            styles: { halign: 'right', fontStyle: 'bold', fontSize: isLandscape ? 8.5 : 7.5, textColor: [190, 18, 60] },
          },
          {
            content: '',
            colSpan: 2,
          },
        ],
      ],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: isLandscape ? 7.8 : 7,
        cellPadding: 1.8,
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: isLandscape ? 8 : 7.2,
        halign: 'center',
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      footStyles: {
        fillColor: [241, 245, 249], // slate-100
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: isLandscape ? 8.5 : 7.5,
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      columnStyles: expenseColumnStyles,
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // -------------------------------------------------------------
    // 5. CLOSING FINANCIAL POSITION / FINAL BALANCE SUMMARY
    // -------------------------------------------------------------
    if (currentY > pageHeight - 30) {
      doc.addPage('a4', orientation);
      currentY = margin;
    }

    const finalCash = data.closingCash !== undefined ? data.closingCash : data.cashBalance;
    const finalBank = data.closingBank !== undefined ? data.closingBank : data.bankBalance;
    const finalAvailable = finalCash + finalBank;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 12, top: 12 },
      tableWidth: contentWidth,
      head: [
        [
          {
            content: 'FINAL CLOSING POSITION & CASH/BANK LIQUIDITY',
            colSpan: 3,
            styles: {
              fillColor: [15, 23, 42], // slate-900
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: isLandscape ? 8.5 : 7.8,
              halign: 'center',
              cellPadding: 2,
            },
          },
        ],
        ['CLOSING CASH IN HAND', 'CLOSING BANK / ACCOUNT BALANCE', 'TOTAL AVAILABLE MONEY'],
      ],
      body: [
        [
          formatCurrency(finalCash, currency),
          formatCurrency(finalBank, currency),
          formatCurrency(finalAvailable, currency),
        ],
      ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: isLandscape ? 9 : 8,
        cellPadding: 2.5,
        lineColor: [148, 163, 184],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        halign: 'center',
        fontStyle: 'bold',
      },
      headStyles: {
        fillColor: [226, 232, 240], // slate-200
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: isLandscape ? 8 : 7.2,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: contentWidth / 3, textColor: [30, 41, 59] },
        1: { cellWidth: contentWidth / 3, textColor: [30, 41, 59] },
        2: { cellWidth: contentWidth / 3, textColor: [4, 120, 87], fontSize: isLandscape ? 9.5 : 8.5 },
      },
    });

    // -------------------------------------------------------------
    // 6. MULTI-PAGE NUMBERING & FOOTERS (Pass across all A4 pages)
    // -------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Bottom footer line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);

      // Left footer
      doc.text(
        `${bName} • A4 Standard Financial Statement`,
        margin,
        pageHeight - 4.5
      );

      // Center footer
      doc.text(`Period: ${data.periodTitle}`, pageWidth / 2, pageHeight - 4.5, {
        align: 'center',
      });

      // Right footer
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 4.5, {
        align: 'right',
      });
    }

    // -------------------------------------------------------------
    // 7. SAVE / DOWNLOAD WITH NATIVE FILE PICKER OR BROWSER DOWNLOAD
    // -------------------------------------------------------------
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
        const pdfBlob = doc.output('blob');
        await writable.write(pdfBlob);
        await writable.close();
        return { success: true, message: `Saved "${cleanFilename}" (A4 PDF) successfully!` };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, message: 'File save cancelled.', cancelled: true };
        }
        // Fallback to standard download
        doc.save(cleanFilename);
        return { success: true, message: `Generated and downloaded "${cleanFilename}" (A4 PDF)!` };
      }
    } else {
      doc.save(cleanFilename);
      return { success: true, message: `Generated and downloaded "${cleanFilename}" (A4 PDF)!` };
    }
  } catch (error) {
    console.error('Failed to generate Excel-style report PDF:', error);
    return {
      success: false,
      message: 'Unable to generate A4 PDF report. Please try again.',
    };
  }
}
