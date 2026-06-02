import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PDFReportOptions {
  title: string;
  subtitle?: string;
  author?: string;
  notes?: string;
  logo?: string;
  kpiData?: {
    label: string;
    value: string;
    change?: string;
  }[];
  tables?: {
    title: string;
    headers: string[];
    rows: string[][];
  }[];
  chartElements?: HTMLElement[];
}

export async function generatePDFReport(options: PDFReportOptions): Promise<void> {
  const {
    title,
    subtitle,
    author = "Cash Flow Planner",
    notes,
    logo,
    kpiData = [],
    tables = [],
    chartElements = [],
  } = options;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Add header with logo
  if (logo) {
    try {
      pdf.addImage(logo, "PNG", margin, yPosition, 30, 30);
      yPosition += 35;
    } catch (error) {
      console.warn("Failed to add logo:", error);
    }
  }

  // Add title
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin, yPosition);
  yPosition += 10;

  // Add subtitle
  if (subtitle) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(subtitle, margin, yPosition);
    yPosition += 8;
  }

  // Add generation date
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  const dateText = `Generato il ${format(new Date(), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}`;
  pdf.text(dateText, margin, yPosition);
  yPosition += 15;

  // Add horizontal line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Add KPI cards
  if (kpiData.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Metriche Chiave", margin, yPosition);
    yPosition += 10;

    const kpiPerRow = 2;
    const kpiWidth = (pageWidth - 2 * margin - 10) / kpiPerRow;
    const kpiHeight = 25;

    kpiData.forEach((kpi, index) => {
      const col = index % kpiPerRow;
      const row = Math.floor(index / kpiPerRow);
      const x = margin + col * (kpiWidth + 10);
      const y = yPosition + row * (kpiHeight + 5);

      // Draw KPI card background
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(x, y, kpiWidth, kpiHeight, 3, 3, "F");

      // Add KPI label
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text(kpi.label, x + 5, y + 8);

      // Add KPI value
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(kpi.value, x + 5, y + 17);

      // Add change if available
      if (kpi.change) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        const changeColor: [number, number, number] = kpi.change.startsWith("+") ? [34, 197, 94] : [239, 68, 68];
        pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
        pdf.text(kpi.change, x + 5, y + 22);
      }
    });

    yPosition += Math.ceil(kpiData.length / kpiPerRow) * (kpiHeight + 5) + 15;
  }

  // Add charts
  for (const chartElement of chartElements) {
    checkPageBreak(100);

    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if image fits on current page
      if (checkPageBreak(imgHeight + 10)) {
        // Image was moved to new page
      }

      pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
    } catch (error) {
      console.error("Failed to add chart:", error);
    }
  }

  // Add tables
  for (const table of tables) {
    checkPageBreak(50);

    // Table title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(table.title, margin, yPosition);
    yPosition += 8;

    // Calculate column widths
    const tableWidth = pageWidth - 2 * margin;
    const colWidth = tableWidth / table.headers.length;
    const rowHeight = 8;

    // Draw header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(margin, yPosition, tableWidth, rowHeight, "F");

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);

    table.headers.forEach((header, index) => {
      const x = margin + index * colWidth + 2;
      pdf.text(header, x, yPosition + 6);
    });

    yPosition += rowHeight;

    // Draw rows
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    table.rows.forEach((row, rowIndex) => {
      if (checkPageBreak(rowHeight)) {
        // Redraw header on new page
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin, yPosition, tableWidth, rowHeight, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        table.headers.forEach((header, index) => {
          const x = margin + index * colWidth + 2;
          pdf.text(header, x, yPosition + 6);
        });
        yPosition += rowHeight;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
      }

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, yPosition, tableWidth, rowHeight, "F");
      }

      row.forEach((cell, colIndex) => {
        const x = margin + colIndex * colWidth + 2;
        pdf.text(cell, x, yPosition + 6);
      });

      yPosition += rowHeight;
    });

    yPosition += 10;
  }

  // Add notes section
  if (notes) {
    checkPageBreak(30);

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Note", margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);

    const lines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (checkPageBreak(6)) {
        // Moved to new page
      }
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 10;
  }

  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150, 150, 150);

    // Page number
    const pageText = `Pagina ${i} di ${totalPages}`;
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 10);

    // Author
    pdf.text(author, margin, pageHeight - 10);
  }

  // Save PDF
  const fileName = `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
  pdf.save(fileName);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatPercentage(value: number): string {
  return `${(value / 100).toFixed(2)}%`;
}
