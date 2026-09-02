import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessProfile } from '../types';
import { formatCurrency, formatDateTimeLocal, getSystemTimeZone } from './utils';
import { sanitizeFilename } from './pdf';

export interface MonthSummaryItem {
  monthNumber: number;
  monthName: string;
  monthId: string;
  sales: number;
  received: number;
  pending: number;
  expenses: number;
  cashReceived: number;
  bankReceived: number;
  cashExpenses: number;
  bankExpenses: number;
  grossProfit: number;
}

export interface YearlyReportPdfData {
  year: number;
  businessProfile: BusinessProfile | null;
  currencySymbol?: string;

  // Top Summaries
  totalAnnualSales: number;
  totalAnnualExpenses: number;
  totalReceived: number;
  totalPending: number;
  cashBalance: number;
  bankBalance: number;
  totalAvailableMoney: number;

  // Cash & Bank Movements
  totalCashReceived: number;
  totalCashExpenses: number;
  netCashMovement: number;
  totalBankReceived: number;
  totalBankExpenses: number;
  netBankMovement: number;

  // Profit / Net Result
  netProfit: number;

  // Performance Highlights
  highestSalesMonth: string;
  highestSalesAmount: number;
  lowestSalesMonth: string;
  lowestSalesAmount: number;
  highestExpenseMonth: string;
  highestExpenseAmount: number;
  avgMonthlySales: number;
  avgMonthlyExpenses: number;

  // 12-Month Matrix
  monthlyData: MonthSummaryItem[];
}

/**
 * Generates a professional, concise, management-only Annual Financial Report in A4 Landscape.
 * Crisp tables, vector-rendered charts, and zero raw transaction bloat.
 */
export async function generateYearlyReportPdf(
  data: YearlyReportPdfData,
  filename?: string
): Promise<{ success: boolean; message: string; cancelled?: boolean }> {
  try {
    const currency = data.currencySymbol || data.businessProfile?.currencySymbol || 'Rs. ';
    const cleanFilename = sanitizeFilename(
      filename || `Annual-Management-Report-${data.year}.pdf`
    );

    // Create A4 Landscape PDF (297mm x 210mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 277 mm

    // =========================================================================
    // PAGE 1: HEADER, TOP SUMMARIES, AND 12-MONTH FINANCIAL MATRIX TABLE
    // =========================================================================
    let currentY = margin;

    // 1. Business Header
    const bName = data.businessProfile?.name || 'LedgerPro Accounting & Invoicing';
    const bAddress = data.businessProfile?.address || '';
    const bPhone = data.businessProfile?.phone || '';
    const bTax = data.businessProfile?.taxRegistrationNumber
      ? `NTN/TRN: ${data.businessProfile.taxRegistrationNumber}`
      : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(bName.toUpperCase(), margin, currentY + 5);

    // Title Badge Right
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`ANNUAL FINANCIAL MANAGEMENT REPORT - ${data.year}`, pageWidth - margin, currentY + 5, {
      align: 'right',
    });

    currentY += 8;

    // Sub-header details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600

    const contactLine = [bAddress, bPhone, bTax].filter(Boolean).join(' • ');
    if (contactLine) {
      doc.text(contactLine, margin, currentY + 3);
    }

    const timeZone = getSystemTimeZone();
    const generatedTimestamp = `Year: ${data.year}  |  Generated: ${formatDateTimeLocal(
      new Date().toISOString()
    )} (${timeZone})`;
    doc.text(generatedTimestamp, pageWidth - margin, currentY + 3, { align: 'right' });

    currentY += 7;

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 4;

    // 2. Top Summary Metric Cards (7 Excel Cards)
    const summaryBoxes = [
      {
        title: 'TOTAL SALES',
        amount: data.totalAnnualSales,
        color: [29, 78, 216], // blue-700
        bgColor: [239, 246, 255],
        borderColor: [191, 219, 254],
      },
      {
        title: 'TOTAL EXPENSES',
        amount: data.totalAnnualExpenses,
        color: [190, 18, 60], // rose-700
        bgColor: [255, 241, 242],
        borderColor: [254, 205, 211],
      },
      {
        title: 'TOTAL RECEIVED',
        amount: data.totalReceived,
        color: [4, 120, 87], // emerald-700
        bgColor: [236, 253, 245],
        borderColor: [167, 243, 208],
      },
      {
        title: 'TOTAL PENDING',
        amount: data.totalPending,
        color: data.totalPending > 0 ? [217, 119, 6] : [71, 85, 105], // amber-600
        bgColor: [254, 243, 199],
        borderColor: [253, 230, 138],
      },
      {
        title: 'CASH BALANCE',
        amount: data.cashBalance,
        color: [30, 41, 59],
        bgColor: [248, 250, 252],
        borderColor: [203, 213, 225],
      },
      {
        title: 'BANK BALANCE',
        amount: data.bankBalance,
        color: [30, 41, 59],
        bgColor: [248, 250, 252],
        borderColor: [203, 213, 225],
      },
      {
        title: 'AVAILABLE MONEY',
        amount: data.totalAvailableMoney,
        color: [16, 185, 129], // emerald-600
        bgColor: [209, 250, 229],
        borderColor: [110, 231, 183],
      },
    ];

    const boxGap = 2.5;
    const numBoxes = summaryBoxes.length;
    const boxWidth = (contentWidth - boxGap * (numBoxes - 1)) / numBoxes;
    const boxHeight = 15;

    summaryBoxes.forEach((box, index) => {
      const boxX = margin + index * (boxWidth + boxGap);
      const boxY = currentY;

      doc.setFillColor(box.bgColor[0], box.bgColor[1], box.bgColor[2]);
      doc.setDrawColor(box.borderColor[0], box.borderColor[1], box.borderColor[2]);
      doc.setLineWidth(0.35);
      doc.rect(boxX, boxY, boxWidth, boxHeight, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(box.title, boxX + boxWidth / 2, boxY + 4, { align: 'center' });

      doc.setDrawColor(box.borderColor[0], box.borderColor[1], box.borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(boxX + 2, boxY + 5.5, boxX + boxWidth - 2, boxY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(box.color[0], box.color[1], box.color[2]);
      const formattedAmt = formatCurrency(box.amount, currency);
      doc.text(formattedAmt, boxX + boxWidth / 2, boxY + 11.5, { align: 'center' });
    });

    currentY += boxHeight + 4.5;

    // 3. Monthly Financial Summary Table
    const tableBody = data.monthlyData.map((m) => [
      m.monthName,
      formatCurrency(m.sales, currency),
      formatCurrency(m.received, currency),
      formatCurrency(m.pending, currency),
      formatCurrency(m.expenses, currency),
      formatCurrency(m.cashReceived, currency),
      formatCurrency(m.bankReceived, currency),
      formatCurrency(m.cashExpenses, currency),
      formatCurrency(m.bankExpenses, currency),
    ]);

    const totalCashRec = data.monthlyData.reduce((s, m) => s + m.cashReceived, 0);
    const totalBankRec = data.monthlyData.reduce((s, m) => s + m.bankReceived, 0);
    const totalCashExp = data.monthlyData.reduce((s, m) => s + m.cashExpenses, 0);
    const totalBankExp = data.monthlyData.reduce((s, m) => s + m.bankExpenses, 0);

    const tableFoot: any[] = [
      [
        { content: 'YEAR TOTAL', styles: { halign: 'left', fontStyle: 'bold', fontSize: 8.5 } },
        {
          content: formatCurrency(data.totalAnnualSales, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5, textColor: [29, 78, 216] },
        },
        {
          content: formatCurrency(data.totalReceived, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5, textColor: [4, 120, 87] },
        },
        {
          content: formatCurrency(data.totalPending, currency),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fontSize: 8.5,
            textColor: data.totalPending > 0 ? [217, 119, 6] : [71, 85, 105],
          },
        },
        {
          content: formatCurrency(data.totalAnnualExpenses, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5, textColor: [190, 18, 60] },
        },
        {
          content: formatCurrency(totalCashRec, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
        },
        {
          content: formatCurrency(totalBankRec, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
        },
        {
          content: formatCurrency(totalCashExp, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
        },
        {
          content: formatCurrency(totalBankExp, currency),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
        },
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 12, top: 12 },
      tableWidth: contentWidth,
      head: [
        [
          {
            content: `MONTHLY FINANCIAL SUMMARY — 12-MONTH PERFORMANCE BREAKDOWN`,
            colSpan: 9,
            styles: {
              fillColor: [30, 41, 59], // slate-800
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              cellPadding: 2,
            },
          },
        ],
        [
          'Month',
          'Total Sales',
          'Total Received',
          'Total Pending',
          'Total Expenses',
          'Cash Received',
          'Bank Received',
          'Cash Expenses',
          'Bank Expenses',
        ],
      ],
      body: tableBody,
      foot: tableFoot,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.8,
        halign: 'center',
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: { cellWidth: 29, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] },
        2: { cellWidth: 31, halign: 'right', textColor: [4, 120, 87] },
        3: { cellWidth: 31, halign: 'right', textColor: [180, 83, 9] },
        4: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60] },
        5: { cellWidth: 31, halign: 'right' },
        6: { cellWidth: 31, halign: 'right' },
        7: { cellWidth: 31, halign: 'right' },
        8: { cellWidth: 31, halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // 4. Profit & Highlights Mini-Cards below table on Page 1
    const halfWidth = (contentWidth - 4) / 2;

    // Profit Box (Left)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY, halfWidth, 24, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('YEARLY FINANCIAL PERFORMANCE & NET RESULT', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Annual Sales: ${formatCurrency(data.totalAnnualSales, currency)}`, margin + 4, currentY + 10);
    doc.text(`Total Annual Expenses: ${formatCurrency(data.totalAnnualExpenses, currency)}`, margin + 4, currentY + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const profitColor = data.netProfit >= 0 ? [4, 120, 87] : [190, 18, 60];
    doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
    doc.text(
      `Net Profit / Net Result (Sales - Expenses): ${formatCurrency(data.netProfit, currency)}`,
      margin + 4,
      currentY + 20.5
    );

    // Highlights Box (Right)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin + halfWidth + 4, currentY, halfWidth, 24, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('ANNUAL PERFORMANCE HIGHLIGHTS', margin + halfWidth + 8, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Highest Sales Month: ${data.highestSalesMonth} (${formatCurrency(data.highestSalesAmount, currency)})`,
      margin + halfWidth + 8,
      currentY + 10
    );
    doc.text(
      `Lowest Sales Month: ${data.lowestSalesMonth} (${formatCurrency(data.lowestSalesAmount, currency)})`,
      margin + halfWidth + 8,
      currentY + 15
    );
    doc.text(
      `Avg Monthly Sales: ${formatCurrency(data.avgMonthlySales, currency)}  |  Avg Expenses: ${formatCurrency(
        data.avgMonthlyExpenses,
        currency
      )}`,
      margin + halfWidth + 8,
      currentY + 20.5
    );

    // =========================================================================
    // PAGE 2: CASH & BANK MOVEMENTS + 4 HIGH-QUALITY VECTOR CHARTS
    // =========================================================================
    doc.addPage();
    currentY = margin;

    // Header on Page 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`ANNUAL FINANCIAL ANALYSIS & CASH/BANK MOVEMENTS — ${data.year}`, margin, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Liquidity Position & Month-by-Month Graphical Trends', pageWidth - margin, currentY + 4, {
      align: 'right',
    });

    currentY += 8;

    // Cash & Bank Summary Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 12, top: 12 },
      tableWidth: contentWidth,
      head: [
        [
          {
            content: 'YEARLY CASH & BANK MOVEMENTS SUMMARY',
            colSpan: 6,
            styles: {
              fillColor: [15, 23, 42],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8,
              halign: 'center',
            },
          },
        ],
        [
          'Total Cash Received',
          'Total Cash Expenses',
          'Net Cash Movement',
          'Total Bank Received',
          'Total Bank Expenses',
          'Net Bank Movement',
        ],
      ],
      body: [
        [
          formatCurrency(data.totalCashReceived, currency),
          formatCurrency(data.totalCashExpenses, currency),
          formatCurrency(data.netCashMovement, currency),
          formatCurrency(data.totalBankReceived, currency),
          formatCurrency(data.totalBankExpenses, currency),
          formatCurrency(data.netBankMovement, currency),
        ],
      ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        halign: 'center',
        fontStyle: 'bold',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // -------------------------------------------------------------
    // DRAW 4 CRISP VECTOR CHARTS
    // -------------------------------------------------------------
    // Grid: 2 columns x 2 rows
    const chartW = (contentWidth - 6) / 2; // ~135.5 mm
    const chartH = 64; // mm

    const maxSales = Math.max(...data.monthlyData.map((m) => m.sales), 1);
    const maxExpenses = Math.max(...data.monthlyData.map((m) => m.expenses), 1);
    const maxSalesOrExp = Math.max(maxSales, maxExpenses, 1);
    const maxRecOrPending = Math.max(
      ...data.monthlyData.map((m) => Math.max(m.received, m.pending)),
      1
    );

    // Chart 1: Monthly Sales (Top Left)
    drawVectorBarChart(
      doc,
      margin,
      currentY,
      chartW,
      chartH,
      'MONTHLY SALES TREND (Jan - Dec)',
      data.monthlyData.map((m) => ({ label: m.monthName.slice(0, 3), value: m.sales })),
      maxSales,
      [37, 99, 235], // Blue
      currency
    );

    // Chart 2: Monthly Expenses (Top Right)
    drawVectorBarChart(
      doc,
      margin + chartW + 6,
      currentY,
      chartW,
      chartH,
      'MONTHLY EXPENSES TREND (Jan - Dec)',
      data.monthlyData.map((m) => ({ label: m.monthName.slice(0, 3), value: m.expenses })),
      maxExpenses,
      [225, 29, 72], // Rose
      currency
    );

    currentY += chartH + 5;

    // Chart 3: Sales vs Expenses Grouped (Bottom Left)
    drawVectorGroupedBarChart(
      doc,
      margin,
      currentY,
      chartW,
      chartH,
      'SALES VS EXPENSES COMPARISON',
      data.monthlyData.map((m) => ({
        label: m.monthName.slice(0, 3),
        v1: m.sales,
        v2: m.expenses,
      })),
      maxSalesOrExp,
      'Sales',
      'Expenses',
      [37, 99, 235],
      [225, 29, 72],
      currency
    );

    // Chart 4: Received vs Pending Grouped (Bottom Right)
    drawVectorGroupedBarChart(
      doc,
      margin + chartW + 6,
      currentY,
      chartW,
      chartH,
      'RECEIVED VS PENDING COMPARISON',
      data.monthlyData.map((m) => ({
        label: m.monthName.slice(0, 3),
        v1: m.received,
        v2: m.pending,
      })),
      maxRecOrPending,
      'Received',
      'Pending',
      [16, 185, 129], // Emerald
      [245, 158, 11], // Amber
      currency
    );

    // =========================================================================
    // FOOTER ON ALL PAGES
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 7, pageWidth - margin, pageHeight - 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);

      doc.text(
        `${bName} • Annual Financial Management Statement (Summary Only)`,
        margin,
        pageHeight - 3.5
      );

      doc.text(`Year: ${data.year}`, pageWidth / 2, pageHeight - 3.5, { align: 'center' });

      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 3.5, {
        align: 'right',
      });
    }

    // Save with native picker or download
    if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const picker = (window as any).showSaveFilePicker.bind(window);
        const handle = await picker({
          suggestedName: cleanFilename,
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        const pdfBlob = doc.output('blob');
        await writable.write(pdfBlob);
        await writable.close();
        return { success: true, message: `Saved "${cleanFilename}" successfully!` };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, message: 'File save cancelled.', cancelled: true };
        }
        doc.save(cleanFilename);
        return { success: true, message: `Generated and downloaded "${cleanFilename}"!` };
      }
    } else {
      doc.save(cleanFilename);
      return { success: true, message: `Generated and downloaded "${cleanFilename}"!` };
    }
  } catch (error) {
    console.error('Failed to generate Yearly Management Report PDF:', error);
    return {
      success: false,
      message: 'Unable to generate Yearly PDF report. Please try again.',
    };
  }
}

/**
 * Helper to draw a clean vector single-bar chart in jsPDF.
 */
function drawVectorBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  data: { label: string; value: number }[],
  maxValue: number,
  barColor: [number, number, number],
  currency: string
) {
  // Chart background
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 3, y + 4.5);

  // Chart plotting area
  const plotX = x + 16;
  const plotY = y + 7;
  const plotW = w - 20;
  const plotH = h - 14;

  // Grid lines (3 horizontal lines)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 3; i++) {
    const gy = plotY + (plotH / 3) * i;
    doc.line(plotX, gy, plotX + plotW, gy);

    // Axis label
    const val = maxValue - (maxValue / 3) * i;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    const label = val >= 1000 ? `${Math.round(val / 1000)}k` : `${Math.round(val)}`;
    doc.text(label, plotX - 1.5, gy + 1, { align: 'right' });
  }

  // Draw 12 Bars
  const count = data.length;
  const slotW = plotW / count;
  const barW = Math.max(3.5, slotW * 0.55);

  data.forEach((d, idx) => {
    const bx = plotX + idx * slotW + (slotW - barW) / 2;
    const barHeight = maxValue > 0 ? (d.value / maxValue) * plotH : 0;
    const by = plotY + plotH - barHeight;

    if (barHeight > 0.5) {
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(bx, by, barW, barHeight, 'F');
    }

    // Month Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(d.label, bx + barW / 2, plotY + plotH + 4, { align: 'center' });
  });
}

/**
 * Helper to draw a clean vector grouped bar chart in jsPDF.
 */
function drawVectorGroupedBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  data: { label: string; v1: number; v2: number }[],
  maxValue: number,
  l1: string,
  l2: string,
  c1: [number, number, number],
  c2: [number, number, number],
  currency: string
) {
  // Chart background
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 3, y + 4.5);

  // Legend
  const legX = x + w - 42;
  doc.setFillColor(c1[0], c1[1], c1[2]);
  doc.rect(legX, y + 2.5, 3, 2.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(l1, legX + 4, y + 4.5);

  doc.setFillColor(c2[0], c2[1], c2[2]);
  doc.rect(legX + 18, y + 2.5, 3, 2.5, 'F');
  doc.text(l2, legX + 22, y + 4.5);

  // Chart plotting area
  const plotX = x + 16;
  const plotY = y + 7;
  const plotW = w - 20;
  const plotH = h - 14;

  // Grid lines
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 3; i++) {
    const gy = plotY + (plotH / 3) * i;
    doc.line(plotX, gy, plotX + plotW, gy);

    const val = maxValue - (maxValue / 3) * i;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    const label = val >= 1000 ? `${Math.round(val / 1000)}k` : `${Math.round(val)}`;
    doc.text(label, plotX - 1.5, gy + 1, { align: 'right' });
  }

  // Draw 12 Grouped Bars
  const count = data.length;
  const slotW = plotW / count;
  const subBarW = Math.max(1.8, (slotW * 0.7) / 2);

  data.forEach((d, idx) => {
    const groupX = plotX + idx * slotW + (slotW - subBarW * 2) / 2;

    // Bar 1
    const h1 = maxValue > 0 ? (d.v1 / maxValue) * plotH : 0;
    if (h1 > 0.5) {
      doc.setFillColor(c1[0], c1[1], c1[2]);
      doc.rect(groupX, plotY + plotH - h1, subBarW, h1, 'F');
    }

    // Bar 2
    const h2 = maxValue > 0 ? (d.v2 / maxValue) * plotH : 0;
    if (h2 > 0.5) {
      doc.setFillColor(c2[0], c2[1], c2[2]);
      doc.rect(groupX + subBarW, plotY + plotH - h2, subBarW, h2, 'F');
    }

    // Month Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(d.label, groupX + subBarW, plotY + plotH + 4, { align: 'center' });
  });
}
