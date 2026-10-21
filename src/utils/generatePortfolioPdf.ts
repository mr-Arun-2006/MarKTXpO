import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PortfolioHolding } from '../types/market';

export interface ReportConfig {
  investorName?: string;
  reportTitle?: string;
  includeAiRisk?: boolean;
  aiRiskText?: string;
  includeSectorBreakdown?: boolean;
}

export interface PortfolioSummaryMetrics {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  portfolioBeta: number;
  var95Rupees: number;
  sectorAllocation: { sector: string; amount: number; percent: number }[];
}

export function generatePortfolioPdf(
  holdings: PortfolioHolding[],
  metrics: PortfolioSummaryMetrics,
  config: ReportConfig = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const investorName = config.investorName || 'Institutional Client';
  const reportTitle = config.reportTitle || 'PORTFOLIO PERFORMANCE & HOLDINGS REPORT';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // ---- 1. HEADER SECTION ----
  // Deep charcoal background header banner
  doc.setFillColor(26, 24, 22); // #1A1816
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Canyon bar at bottom of banner
  doc.setFillColor(217, 107, 67); // #D96B43 (Canyon)
  doc.rect(0, 31, pageWidth, 1.8, 'F');

  // Brand Name
  doc.setTextColor(247, 238, 219); // #F7EEDB (Butter Cream)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MxpO', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 180, 224); // #8CB4E0 (Morning Sky)
  doc.text('EQUITY TERMINAL · NSE & BSE SURVEILLANCE', margin + 20, 12.5);

  // Subtitle / Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(247, 238, 219);
  doc.text(reportTitle, margin, 22);

  // Metadata block on right side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(210, 205, 195);
  const metaRightX = pageWidth - margin;
  doc.text(`Generated: ${dateStr} at ${timeStr} IST`, metaRightX, 11, { align: 'right' });
  doc.text(`Account / Investor: ${investorName}`, metaRightX, 16, { align: 'right' });
  doc.text('Market Scope: NSE & BSE Listed Equities · INR (₹)', metaRightX, 21, { align: 'right' });

  let currentY = 38;

  // ---- 2. EXECUTIVE PERFORMANCE SUMMARY METRICS ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 28, 26);
  doc.text('EXECUTIVE PERFORMANCE METRICS', margin, currentY);

  currentY += 4;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  const metricCards = [
    {
      label: 'CURRENT PORTFOLIO VALUE',
      value: `INR ${metrics.currentValue.toLocaleString('en-IN')}`,
      sub: `Invested: INR ${metrics.totalInvested.toLocaleString('en-IN')}`,
      color: [26, 24, 22],
    },
    {
      label: 'UNREALIZED P&L',
      value: `${metrics.totalPnL >= 0 ? '+' : ''}INR ${metrics.totalPnL.toLocaleString('en-IN')}`,
      sub: `${metrics.totalPnLPercent >= 0 ? '+' : ''}${metrics.totalPnLPercent}% Overall Return`,
      color: metrics.totalPnL >= 0 ? [34, 197, 94] : [239, 68, 68],
    },
    {
      label: 'PORTFOLIO BETA',
      value: `${metrics.portfolioBeta.toFixed(2)}`,
      sub: metrics.portfolioBeta > 1.1 ? 'High Market Sensitivity' : 'Balanced Exposure',
      color: [217, 107, 67],
    },
    {
      label: '1-DAY VaR (95% CONF.)',
      value: `-INR ${metrics.var95Rupees.toLocaleString('en-IN')}`,
      sub: 'Estimated max daily risk',
      color: [239, 68, 68],
    },
  ];

  metricCards.forEach((c, index) => {
    const x = margin + index * (cardWidth + 3);
    // Card background
    doc.setFillColor(248, 247, 245);
    doc.setDrawColor(220, 215, 205);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Accent line on left of card
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, 1.2, cardHeight, 'F');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(110, 105, 100);
    doc.text(c.label, x + 3.5, currentY + 4.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 3.5, currentY + 10.5);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 85, 80);
    doc.text(c.sub, x + 3.5, currentY + 15);
  });

  currentY += cardHeight + 8;

  // ---- 3. CURRENT HOLDINGS TABLE ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 28, 26);
  doc.text(`CURRENT HOLDINGS DETAIL (${holdings.length} POSITIONS)`, margin, currentY);

  currentY += 3;

  const tableRows = holdings.map((h) => {
    const cost = h.shares * h.averageBuyPrice;
    const val = h.shares * h.currentPrice;
    const pnl = val - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const weight = metrics.currentValue > 0 ? (val / metrics.currentValue) * 100 : 0;

    return [
      h.ticker,
      h.name,
      h.exchange,
      h.sector,
      h.shares.toString(),
      h.averageBuyPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      h.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      val.toLocaleString('en-IN'),
      `${weight.toFixed(1)}%`,
      `${pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-IN')} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`,
      h.beta.toFixed(2),
    ];
  });

  // Summary row
  tableRows.push([
    'TOTAL / PORTFOLIO',
    'Aggregated Active Exposure',
    'ALL',
    `${metrics.sectorAllocation.length} Sectors`,
    holdings.reduce((acc, h) => acc + h.shares, 0).toString(),
    '-',
    '-',
    metrics.currentValue.toLocaleString('en-IN'),
    '100.0%',
    `${metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toLocaleString('en-IN')} (${metrics.totalPnLPercent >= 0 ? '+' : ''}${metrics.totalPnLPercent}%)`,
    metrics.portfolioBeta.toFixed(2),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Ticker',
        'Company Name',
        'Exch',
        'Sector',
        'Shares',
        'Buy (₹)',
        'Price (₹)',
        'Value (₹)',
        'Weight',
        'P&L (₹ / %)',
        'Beta',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [40, 38, 35],
      lineColor: [225, 220, 212],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [26, 24, 22], // #1A1816
      textColor: [247, 238, 219], // #F7EEDB
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [252, 251, 249],
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'left', cellWidth: 32 },
      2: { halign: 'center' },
      3: { halign: 'left' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold' },
      10: { halign: 'center' },
    },
    didParseCell: (data) => {
      // Highlight summary row
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 238, 230];
        data.cell.styles.textColor = [26, 24, 22];
      }
      // P&L color styling in column 9
      if (data.column.index === 9 && data.section === 'body') {
        const text = String(data.cell.raw || '');
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [22, 138, 62];
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [200, 40, 40];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : currentY + 60;
  let nextSectionY = finalY;

  // Check if we need a new page for Sector Breakdown & Risk Assessment
  if (nextSectionY > pageHeight - 65) {
    doc.addPage();
    nextSectionY = margin + 10;
  }

  // ---- 4. SECTOR ALLOCATION BREAKDOWN ----
  if (config.includeSectorBreakdown !== false && metrics.sectorAllocation.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 28, 26);
    doc.text('SECTOR EXPOSURE & DIVERSIFICATION', margin, nextSectionY);

    nextSectionY += 3;

    const sectorRows = metrics.sectorAllocation.map((s) => [
      s.sector,
      `INR ${s.amount.toLocaleString('en-IN')}`,
      `${s.percent.toFixed(1)}%`,
      s.percent > 35 ? 'Concentrated (>35%)' : s.percent > 20 ? 'Substantial (20-35%)' : 'Balanced (<20%)',
    ]);

    autoTable(doc, {
      startY: nextSectionY,
      head: [['Sector', 'Allocated Value (INR)', 'Portfolio Weight', 'Diversification Status']],
      body: sectorRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        font: 'helvetica',
        textColor: [40, 38, 35],
        lineColor: [225, 220, 212],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [45, 41, 38],
        textColor: [247, 238, 219],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'left' },
      },
    });

    nextSectionY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---- 5. AI RISK AUDIT & SURVEILLANCE DIRECTIVES ----
  if (config.includeAiRisk !== false && config.aiRiskText) {
    if (nextSectionY > pageHeight - 55) {
      doc.addPage();
      nextSectionY = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 28, 26);
    doc.text('INSTITUTIONAL RISK AUDIT & HEDGING DIRECTIVES', margin, nextSectionY);

    nextSectionY += 4;

    doc.setFillColor(248, 247, 244);
    doc.setDrawColor(217, 107, 67);
    doc.setLineWidth(0.3);

    // Split text to fit width
    const textWidth = pageWidth - margin * 2 - 8;
    const splitAiText = doc.splitTextToSize(config.aiRiskText, textWidth);
    const boxHeight = Math.min(splitAiText.length * 3.5 + 8, pageHeight - nextSectionY - 20);

    doc.roundedRect(margin, nextSectionY, pageWidth - margin * 2, boxHeight, 1.5, 1.5, 'FD');

    // Little Canyon accent block
    doc.setFillColor(217, 107, 67);
    doc.rect(margin, nextSectionY, 1.5, boxHeight, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(45, 42, 38);
    doc.text(splitAiText, margin + 4, nextSectionY + 5);

    nextSectionY += boxHeight + 8;
  }

  // ---- 6. COMPLIANCE & PAGE FOOTER ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(220, 215, 205);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Disclaimer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 115, 110);
    doc.text(
      'CONFIDENTIAL · Generated via MxpO Indian Equities Terminal. For analytical & risk surveillance purposes only. Not SEBI registered investment advice.',
      margin,
      pageHeight - 7
    );

    // Page Number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  return doc;
}
