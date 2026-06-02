import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDate } from "./dateFormat";

interface SimulazioneData {
  fiume: string;
  mesi: Array<{
    mese: number;
    valore: number;
    rendita: number;
    cashFlowMensile: number;
    affluenteMese?: number;
  }>;
}

interface ExportOptions {
  title: string;
  dataInizio?: Date | string | null;
  filteredMesi?: number[];
}

/**
 * Export simulazione data to PDF
 */
export function exportToPDF(
  simulazione: SimulazioneData[],
  options: ExportOptions
) {
  const doc = new jsPDF();
  const { title, dataInizio, filteredMesi } = options;

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`, 14, 28);

  let yPosition = 40;

  // For each fiume
  simulazione.forEach((fiume, index) => {
    if (index > 0) {
      doc.addPage();
      yPosition = 20;
    }

    // Fiume name
    doc.setFontSize(14);
    doc.text(`Fiume: ${fiume.fiume}`, 14, yPosition);
    yPosition += 10;

    // Filter mesi if needed
    const mesiToShow = filteredMesi 
      ? fiume.mesi.filter(m => filteredMesi.includes(m.mese))
      : fiume.mesi;

    // Table data
    const tableData = mesiToShow.map(m => [
      dataInizio ? formatDate(calculateDate(dataInizio, m.mese), "MMM yyyy") : `Mese ${m.mese}`,
      formatCurrency(m.valore),
      formatCurrency(m.rendita),
      formatCurrency(m.affluenteMese || 0),
      formatCurrency(m.cashFlowMensile),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Periodo", "Valore", "Rendita", "Apporti", "Cash Flow"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
  });

  // Save
  doc.save(`${title.toLowerCase().replace(/ /g, "_")}.pdf`);
}

/**
 * Export simulazione data to Excel
 */
export function exportToExcel(
  simulazione: SimulazioneData[],
  options: ExportOptions
) {
  const { title, dataInizio, filteredMesi } = options;
  const workbook = XLSX.utils.book_new();

  // Create a sheet for each fiume
  simulazione.forEach(fiume => {
    // Filter mesi if needed
    const mesiToShow = filteredMesi 
      ? fiume.mesi.filter(m => filteredMesi.includes(m.mese))
      : fiume.mesi;

    const data = mesiToShow.map(m => ({
      Periodo: dataInizio ? formatDate(calculateDate(dataInizio, m.mese), "MMMM yyyy") : `Mese ${m.mese}`,
      Valore: m.valore / 100,
      Rendita: m.rendita / 100,
      Apporti: (m.affluenteMese || 0) / 100,
      "Cash Flow": m.cashFlowMensile / 100,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Periodo
      { wch: 12 }, // Valore
      { wch: 12 }, // Rendita
      { wch: 12 }, // Apporti
      { wch: 12 }, // Cash Flow
    ];

    // Sanitize sheet name (max 31 chars, no special chars)
    const sheetName = fiume.fiume.substring(0, 31).replace(/[:\\/?*\[\]]/g, "");
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Create summary sheet
  const summaryData: any[] = [];
  const allMesi = filteredMesi || Array.from(
    new Set(simulazione.flatMap(f => f.mesi.map(m => m.mese)))
  ).sort((a, b) => a - b);

  allMesi.forEach(mese => {
    let totaleValore = 0;
    let totaleRendita = 0;
    let totaleApporti = 0;
    let totaleCashFlow = 0;

    simulazione.forEach(fiume => {
      const meseData = fiume.mesi.find(m => m.mese === mese);
      if (meseData) {
        totaleValore += meseData.valore;
        totaleRendita += meseData.rendita;
        totaleApporti += meseData.affluenteMese || 0;
        totaleCashFlow += meseData.cashFlowMensile;
      }
    });

    summaryData.push({
      Periodo: dataInizio ? formatDate(calculateDate(dataInizio, mese), "MMMM yyyy") : `Mese ${mese}`,
      "Valore Totale": totaleValore / 100,
      "Rendita Totale": totaleRendita / 100,
      "Apporti Totali": totaleApporti / 100,
      "Cash Flow Totale": totaleCashFlow / 100,
    });
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Riepilogo");

  // Save
  XLSX.writeFile(workbook, `${title.toLowerCase().replace(/ /g, "_")}.xlsx`);
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Calculate date from offset
 */
function calculateDate(dataInizio: Date | string, offset: number): Date {
  const start = typeof dataInizio === "string" ? new Date(dataInizio) : dataInizio;
  const result = new Date(start);
  result.setMonth(result.getMonth() + offset);
  return result;
}
