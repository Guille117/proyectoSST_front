import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type Celda = string | number;

export function exportarPdf(titulo: string, encabezados: string[], filas: Celda[][]): void {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  autoTable(doc, { head: [encabezados], body: filas, startY: 22 });
  doc.save(`${titulo}.pdf`);
}

export function exportarExcel(titulo: string, encabezados: string[], filas: Celda[][]): void {
  const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  XLSX.writeFile(libro, `${titulo}.xlsx`);
}
