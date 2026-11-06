import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type Celda = string | number;

const TIPO_PDF = 'application/pdf';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function crearPdf(titulo: string, encabezados: string[], filas: Celda[][]): Blob {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  autoTable(doc, { head: [encabezados], body: filas, startY: 22 });
  return doc.output('blob');
}

export function crearExcel(titulo: string, encabezados: string[], filas: Celda[][]): Blob {
  const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  const datos = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([datos], { type: TIPO_EXCEL });
}

export function exportarPdf(titulo: string, encabezados: string[], filas: Celda[][]): void {
  descargarBlob(crearPdf(titulo, encabezados, filas), `${titulo}.pdf`);
}

export function exportarExcel(titulo: string, encabezados: string[], filas: Celda[][]): void {
  descargarBlob(crearExcel(titulo, encabezados, filas), `${titulo}.xlsx`);
}

function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
