import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';

const MARGEN_MM = 15;
const ANCHO_PAGINA_MM = 210;
const ANCHO_UTIL_MM = ANCHO_PAGINA_MM - MARGEN_MM * 2;

/** Datos ya resueltos con los que se dibuja la carta de consentimiento. */
export interface AutorizacionDocumento {
  paciente: { nombre: string; cui: string | null };
  autoriza: { nombre: string; cui: string | null; calidad: string };
  medico: { nombre: string };
  procedimiento: { nombre: string };
  fechaGeneracion: Date;
}

/**
 * Genera la carta de consentimiento informado y autorización de procedimiento médico como PDF.
 * Devuelve un Blob para mostrarse en un visor, sin descargarse automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoAutorizacionPdfService {
  async generarBlob(datos: AutorizacionDocumento): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await this.cargarLogo();

    let posicion = this.dibujarCabecera(documento, logo, datos.fechaGeneracion);
    posicion = this.dibujarTitulo(documento, posicion);
    posicion = this.dibujarCuerpo(documento, datos, posicion);
    this.dibujarFirmas(documento, posicion);
    this.dibujarFooter(documento);

    return documento.output('blob');
  }

  /** Cabecera: logo a la izquierda y nombre del sanatorio con fecha y hora a la derecha. */
  private dibujarCabecera(documento: jsPDF, logo: string | null, fecha: Date): number {
    if (logo) {
      try {
        documento.addImage(logo, 'JPEG', MARGEN_MM, MARGEN_MM, 24, 24);
      } catch {
        // El documento sigue siendo válido aunque el logo no se pueda incrustar.
      }
    }

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(14);
    documento.setTextColor(15, 23, 42);
    documento.text('Sanatorio Santa Teresita', ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 6, {
      align: 'right',
    });

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(71, 85, 105);
    documento.text(this.formatearFechaHora(fecha), ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 12, {
      align: 'right',
    });

    documento.setDrawColor(203, 213, 225);
    documento.line(MARGEN_MM, MARGEN_MM + 20, ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 20);

    return MARGEN_MM + 30;
  }

  private dibujarTitulo(documento: jsPDF, posicion: number): number {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(12);
    documento.setTextColor(15, 23, 42);

    const lineas = documento.splitTextToSize(
      'CONSENTIMIENTO INFORMADO Y AUTORIZACIÓN DE PROCEDIMIENTO MÉDICO',
      ANCHO_UTIL_MM,
    );
    documento.text(lineas, ANCHO_PAGINA_MM / 2, posicion, { align: 'center' });

    return posicion + lineas.length * 6 + 6;
  }

  private dibujarCuerpo(documento: jsPDF, datos: AutorizacionDocumento, posicion: number): number {
    const parrafos = this.construirParrafos(datos);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(30, 41, 59);

    let y = posicion;
    for (const parrafo of parrafos) {
      const lineas = documento.splitTextToSize(parrafo, ANCHO_UTIL_MM);
      const alto = lineas.length * 4.8;

      if (y + alto > this.limiteInferior(documento)) {
        documento.addPage();
        y = MARGEN_MM;
      }

      documento.text(lineas, MARGEN_MM, y);
      y += alto + 5;
    }

    return y;
  }

  private dibujarFirmas(documento: jsPDF, posicion: number): void {
    let y = posicion + 20;

    if (y + 40 > this.limiteInferior(documento)) {
      documento.addPage();
      y = MARGEN_MM + 20;
    }

    const izquierdaX = MARGEN_MM;
    const derechaX = MARGEN_MM + 95;
    const anchoFirma = 80;

    documento.setDrawColor(100, 116, 139);
    documento.line(izquierdaX, y, izquierdaX + anchoFirma, y);
    documento.line(derechaX, y, derechaX + anchoFirma, y);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(71, 85, 105);
    documento.text(
      'Firma del paciente o representante legal',
      izquierdaX + anchoFirma / 2,
      y + 5,
      { align: 'center' },
    );
    documento.text('Firma y sello del médico', derechaX + anchoFirma / 2, y + 5, {
      align: 'center',
    });
  }

  private dibujarFooter(documento: jsPDF): void {
    const altoPagina = documento.internal.pageSize.getHeight();
    const total = documento.getNumberOfPages();

    for (let pagina = 1; pagina <= total; pagina++) {
      documento.setPage(pagina);

      const y = altoPagina - 12;
      documento.setDrawColor(203, 213, 225);
      documento.line(MARGEN_MM, y - 8, ANCHO_PAGINA_MM - MARGEN_MM, y - 8);

      documento.setFont('helvetica', 'normal');
      documento.setFontSize(8);
      documento.setTextColor(100, 116, 139);
      documento.text(
        '5ta. Avenida 13-50 Zona 1 Barrio el Carmen Sololá · sanatoriostsolola@gmail.com · 77623676 - 34084066',
        ANCHO_PAGINA_MM / 2,
        y,
        { align: 'center' },
      );
    }
  }

  private construirParrafos(datos: AutorizacionDocumento): string[] {
    const identificacion = datos.autoriza.cui?.trim() || '—';

    return [
      `Yo, ${datos.autoriza.nombre}, identificado(a) con el número ${identificacion}, actuando en mi calidad de ${datos.autoriza.calidad}, manifiesto que he recibido por parte del médico ${datos.medico.nombre}, del Sanatorio Santa Teresita, información clara, suficiente y comprensible sobre el procedimiento médico denominado ${datos.procedimiento.nombre}, que se propone realizar a ${datos.paciente.nombre}.`,
      `Declaro que se me ha explicado en qué consiste dicho procedimiento, cuál es su finalidad, los beneficios que se esperan obtener, los riesgos y posibles complicaciones asociados, así como las alternativas médicas disponibles, incluida la posibilidad de no realizarlo y las consecuencias previsibles de dicha decisión. Asimismo, comprendo que, aunque el personal médico aplicará los conocimientos y cuidados correspondientes, no es posible garantizar resultados específicos.`,
      `He tenido la oportunidad de formular preguntas, expresar mis inquietudes y recibir respuestas comprensibles por parte del profesional responsable. Manifiesto que he comprendido la información proporcionada y que mi decisión se realiza de manera libre y voluntaria, sin presiones ni condicionamientos.`,
      `En virtud de lo anterior, autorizo expresamente la realización del procedimiento médico antes descrito, conforme a las explicaciones recibidas y a las condiciones clínicas informadas. Entiendo que puedo retirar mi consentimiento antes de su realización, de acuerdo con las disposiciones médicas y legales aplicables.`,
      `Para constancia de lo anterior, firmo el presente documento en el municipio de Sololá, departamento de Sololá, en la fecha indicada.`,
    ];
  }

  private limiteInferior(documento: jsPDF): number {
    return documento.internal.pageSize.getHeight() - 25;
  }

  private formatearFechaHora(fecha: Date): string {
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');

    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()} · ${horas}:${minutos}`;
  }

  private async cargarLogo(): Promise<string | null> {
    try {
      const respuesta = await fetch(new URL('logo.jpeg', document.baseURI).toString());
      if (!respuesta.ok) return null;

      const archivo = await respuesta.blob();
      return await new Promise<string>((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(String(lector.result));
        lector.onerror = () => rechazar(lector.error);
        lector.readAsDataURL(archivo);
      });
    } catch {
      return null;
    }
  }
}
