import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type { Styles } from 'jspdf-autotable';
import type { TipoAltaApi, TipoTratamientoApi } from '../../../Medica/alta/data/altaInterfaz';
import type { MedicoDocumento, PacienteDocumento } from './documento-tratamiento-pdf-service';

const MARGEN_MM = 15;
const ANCHO_PAGINA_MM = 210;
const ANCHO_UTIL_MM = ANCHO_PAGINA_MM - MARGEN_MM * 2;

interface TratamientoAltaDocumento {
  tipo: TipoTratamientoApi;
  nombre: string;
  cantidad: number | null;
  unidadMedida: string | null;
  frecuencia: number | null;
  duracionTipo: string | null;
  duracion: number | null;
  observaciones: string | null;
}

export interface AltaDocumento {
  tipoAlta: TipoAltaApi;
  diagnosticoEgreso: string;
  condicionEgresoNombre: string | null;
  observacionEgreso: string | null;
  fechaHoraEgreso: string;
  motivoRetiro: string | null;
  riesgosRetiro: string[];
  institucionNombre: string | null;
  motivoReferencia: string | null;
  indicacionesTraslado: string | null;
  tratamientos: TratamientoAltaDocumento[];
}

export interface DatosDocumentoAlta {
  paciente: PacienteDocumento;
  alta: AltaDocumento;
  medico: MedicoDocumento;
}

interface DocumentoConTabla extends jsPDF {
  lastAutoTable?: { finalY?: number };
}

@Injectable({ providedIn: 'root' })
export class DocumentoAltaPdfService {
  async generarBlob(datos: DatosDocumentoAlta): Promise<Blob> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await this.cargarLogo();

    this.dibujarCabecera(documento, logo);
    let posicion = this.dibujarPaciente(documento, datos.paciente, 62);
    posicion = this.dibujarTitulo(documento, this.tituloAlta(datos.alta.tipoAlta), posicion);
    posicion = this.dibujarSeccion(documento, 'Diagnóstico de egreso', datos.alta.diagnosticoEgreso, posicion);

    const condicion = datos.alta.condicionEgresoNombre?.trim();
    if (condicion) {
      posicion = this.dibujarSeccion(documento, 'Condición de egreso', condicion, posicion);
    }

    const observacion = datos.alta.observacionEgreso?.trim();
    if (observacion) {
      posicion = this.dibujarSeccion(documento, 'Observaciones', observacion, posicion);
    }

    if (datos.alta.tipoAlta === 'RETIRO_VOLUNTARIO') {
      const motivo = datos.alta.motivoRetiro?.trim();
      if (motivo) posicion = this.dibujarSeccion(documento, 'Motivo del retiro', motivo, posicion);
      if (datos.alta.riesgosRetiro.length) {
        posicion = this.dibujarSeccion(
          documento,
          'Riesgos informados',
          datos.alta.riesgosRetiro.join(', '),
          posicion,
        );
      }
    }

    if (datos.alta.tipoAlta === 'REFERENCIA_TRASLADO') {
      const institucion = datos.alta.institucionNombre?.trim();
      const motivo = datos.alta.motivoReferencia?.trim();
      const indicaciones = datos.alta.indicacionesTraslado?.trim();
      if (institucion) {
        posicion = this.dibujarSeccion(documento, 'Institución de destino', institucion, posicion);
      }
      if (motivo) posicion = this.dibujarSeccion(documento, 'Motivo de referencia', motivo, posicion);
      if (indicaciones) {
        posicion = this.dibujarSeccion(documento, 'Indicaciones de traslado', indicaciones, posicion);
      }
    }

    if (datos.alta.tratamientos.length) {
      posicion = this.dibujarSubtitulo(documento, 'Tratamiento indicado', posicion);
      autoTable(documento, {
        startY: posicion,
        head: [['Tipo', 'Indicación', 'Cantidad', 'Frecuencia', 'Duración', 'Observaciones']],
        body: datos.alta.tratamientos.map((tratamiento) => [
          tratamiento.tipo === 'MEDICAMENTO' ? 'Medicamento' : 'Cuidado',
          tratamiento.nombre,
          this.textoCantidad(tratamiento),
          tratamiento.frecuencia ? `Cada ${tratamiento.frecuencia} horas` : '—',
          this.textoDuracion(tratamiento),
          tratamiento.observaciones?.trim() || '—',
        ]),
        theme: 'grid',
        styles: this.estilosTabla(),
        headStyles: this.estilosCabeceraTabla(),
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 46 },
          2: { cellWidth: 24 },
          3: { cellWidth: 26 },
          4: { cellWidth: 26 },
          5: { cellWidth: 34 },
        },
        margin: { left: MARGEN_MM, right: MARGEN_MM },
      });
      posicion = this.finalDeTabla(documento) + 8;
    }

    this.dibujarMedico(documento, datos.medico, posicion);
    return documento.output('blob');
  }

  private tituloAlta(tipo: TipoAltaApi): string {
    switch (tipo) {
      case 'RETIRO_VOLUNTARIO':
        return 'HOJA DE ALTA VOLUNTARIA';
      case 'REFERENCIA_TRASLADO':
        return 'HOJA DE REFERENCIA Y TRASLADO';
      default:
        return 'INDICACIÓN MÉDICA DE EGRESO';
    }
  }

  private dibujarCabecera(documento: jsPDF, logo: string | null): void {
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
    documento.text('Barrio el Carmen Sololá · 77623676 - 34084066', ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 12, {
      align: 'right',
    });

    documento.setDrawColor(203, 213, 225);
    documento.line(MARGEN_MM, MARGEN_MM + 20, ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 20);
  }

  private dibujarPaciente(documento: jsPDF, paciente: PacienteDocumento, posicion: number): number {
    documento.setFontSize(9);
    const lineasDireccion = documento.splitTextToSize(
      `Dirección: ${paciente.direccion}`,
      ANCHO_UTIL_MM - 10,
    ) as string[];
    const alto = 20 + lineasDireccion.length * 5;

    documento.setFillColor(248, 250, 252);
    documento.setDrawColor(226, 232, 240);
    documento.roundedRect(MARGEN_MM, posicion, ANCHO_UTIL_MM, alto, 2, 2, 'FD');

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(30, 41, 59);
    documento.text('Paciente', MARGEN_MM + 5, posicion + 8);
    documento.setFontSize(12);
    documento.text(paciente.nombre, MARGEN_MM + 27, posicion + 8);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(71, 85, 105);

    const datos = [
      paciente.cui ? `CUI: ${paciente.cui}` : null,
      `Sexo: ${paciente.sexo}`,
      `Edad: ${paciente.edad}`,
    ].filter((dato): dato is string => Boolean(dato));

    documento.text(datos.join('   |   '), MARGEN_MM + 5, posicion + 15);
    documento.text(lineasDireccion, MARGEN_MM + 5, posicion + 22);

    return posicion + alto + 10;
  }

  private dibujarTitulo(documento: jsPDF, titulo: string, posicion: number): number {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(12);
    documento.setTextColor(15, 23, 42);
    documento.text(titulo, ANCHO_PAGINA_MM / 2, posicion, { align: 'center' });
    return posicion + 10;
  }

  private dibujarSeccion(
    documento: jsPDF,
    titulo: string,
    texto: string,
    posicion: number,
  ): number {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(10);
    documento.setTextColor(30, 41, 59);
    documento.text(titulo, MARGEN_MM, posicion);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9.5);
    documento.setTextColor(51, 65, 85);
    const lineas = documento.splitTextToSize(texto, ANCHO_UTIL_MM) as string[];
    let y = posicion + 5;

    for (const linea of lineas) {
      if (y > this.limiteInferior(documento)) {
        documento.addPage();
        y = MARGEN_MM;
      }
      documento.text(linea, MARGEN_MM, y);
      y += 4.8;
    }

    return y + 4;
  }

  private dibujarSubtitulo(documento: jsPDF, titulo: string, posicion: number): number {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(30, 41, 59);
    documento.text(titulo, MARGEN_MM, posicion);
    return posicion + 4;
  }

  private dibujarMedico(documento: jsPDF, medico: MedicoDocumento, posicion: number): void {
    const altoPagina = documento.internal.pageSize.getHeight();
    const limite = altoPagina - MARGEN_MM - 12;
    let posicionMedico = Math.max(posicion + 10, limite);

    if (posicionMedico > limite) {
      documento.addPage();
      posicionMedico = limite;
    }

    const derecha = ANCHO_PAGINA_MM - MARGEN_MM;

    documento.setDrawColor(203, 213, 225);
    documento.line(derecha - 70, posicionMedico - 4, derecha, posicionMedico - 4);

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(10);
    documento.setTextColor(30, 41, 59);
    documento.text(medico.nombre, derecha, posicionMedico + 2, { align: 'right' });

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.setTextColor(71, 85, 105);
    documento.text(medico.especialidad, derecha, posicionMedico + 7, { align: 'right' });
  }

  private textoCantidad(tratamiento: TratamientoAltaDocumento): string {
    if (tratamiento.cantidad === null) return '—';
    const unidad = tratamiento.unidadMedida?.trim();
    return `${tratamiento.cantidad}${unidad ? ` ${unidad}` : ''}`;
  }

  private textoDuracion(tratamiento: TratamientoAltaDocumento): string {
    if (tratamiento.duracionTipo === null) return '—';
    if (tratamiento.duracionTipo === 'DOSIS_UNICA') return 'Dosis única';
    if (tratamiento.duracionTipo === 'TIEMPO_INDEFINIDO') return 'Tiempo indefinido';
    const dias = tratamiento.duracion ?? 0;
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  private estilosTabla(): Partial<Styles> {
    return {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
      textColor: [51, 65, 85],
    };
  }

  private estilosCabeceraTabla(): Partial<Styles> {
    return {
      fillColor: [240, 244, 250],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
    };
  }

  private finalDeTabla(documento: jsPDF): number {
    return (documento as DocumentoConTabla).lastAutoTable?.finalY ?? MARGEN_MM;
  }

  private limiteInferior(documento: jsPDF): number {
    return documento.internal.pageSize.getHeight() - 25;
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
