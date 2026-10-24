import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type { Styles } from 'jspdf-autotable';

const MARGEN_MM = 15;
const ANCHO_PAGINA_MM = 210;
const ANCHO_UTIL_MM = ANCHO_PAGINA_MM - MARGEN_MM * 2;

export interface TratamientoDocumento {
  nombre: string;
  cantidad?: string;
  frecuencia: string;
  duracion: string;
  observaciones: string;
}

export interface PacienteDocumento {
  nombre: string;
  cui: string | null;
  sexo: string;
  edad: string;
  direccion: string;
}

export interface MedicoDocumento {
  nombre: string;
  especialidad: string;
}

export interface DatosDocumentoTratamiento {
  paciente: PacienteDocumento;
  medicamentos: TratamientoDocumento[];
  cuidados: TratamientoDocumento[];
  medico: MedicoDocumento;
}

interface DocumentoConTabla extends jsPDF {
  lastAutoTable?: { finalY?: number };
}

@Injectable({
  providedIn: 'root',
})
export class DocumentoTratamientoPdfService {
  /** Genera el PDF del tratamiento del alta con los datos ya preparados por el componente. */
  async generar(datos: DatosDocumentoTratamiento): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await this.cargarLogo();

    this.dibujarCabecera(documento, logo);
    let posicion = this.dibujarPaciente(documento, datos.paciente, 62);

    if (datos.medicamentos.length) {
      posicion = this.dibujarSubtitulo(documento, 'Medicamentos', posicion);
      autoTable(documento, {
        startY: posicion,
        head: [['Medicamento', 'Cantidad', 'Frecuencia', 'Duración', 'Observaciones']],
        body: datos.medicamentos.map((tratamiento) => [
          tratamiento.nombre,
          tratamiento.cantidad || '—',
          tratamiento.frecuencia,
          tratamiento.duracion,
          tratamiento.observaciones,
        ]),
        theme: 'grid',
        styles: this.estilosTabla(),
        headStyles: this.estilosCabeceraTabla(),
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 32 },
          3: { cellWidth: 28 },
          4: { cellWidth: 40 },
        },
        margin: { left: MARGEN_MM, right: MARGEN_MM },
      });
      posicion = this.finalDeTabla(documento) + 8;
    }

    if (datos.cuidados.length) {
      posicion = this.dibujarSubtitulo(documento, 'Cuidados', posicion);
      autoTable(documento, {
        startY: posicion,
        head: [['Cuidado', 'Frecuencia', 'Duración', 'Observaciones']],
        body: datos.cuidados.map((tratamiento) => [
          tratamiento.nombre,
          tratamiento.frecuencia,
          tratamiento.duracion,
          tratamiento.observaciones,
        ]),
        theme: 'grid',
        styles: this.estilosTabla(),
        headStyles: this.estilosCabeceraTabla(),
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 38 },
          2: { cellWidth: 30 },
          3: { cellWidth: 57 },
        },
        margin: { left: MARGEN_MM, right: MARGEN_MM },
      });
      posicion = this.finalDeTabla(documento) + 8;
    }

    this.dibujarMedico(documento, datos.medico, posicion);
    documento.save(this.nombreArchivo(datos.paciente.nombre));
  }

  private dibujarCabecera(documento: jsPDF, logo: string | null): void {
    if (logo) {
      try {
        documento.addImage(logo, 'JPEG', MARGEN_MM, MARGEN_MM, 28, 28);
      } catch {
        // El documento sigue siendo válido aunque el logo no se pueda incrustar.
      }
    }

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(13);
    documento.setTextColor(60, 45, 30);
    documento.text('Sanatorio Santa Teresita', MARGEN_MM, MARGEN_MM + 34);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(71, 85, 105);
    documento.text('Barrio el Carmen Sololá', ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 4, {
      align: 'right',
    });
    documento.text('11111111', ANCHO_PAGINA_MM - MARGEN_MM, MARGEN_MM + 10, {
      align: 'right',
    });
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

  private estilosTabla(): Partial<Styles> {
    return {
      font: 'helvetica',
      fontSize: 8,
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

  private nombreArchivo(nombrePaciente: string): string {
    const limpio = nombrePaciente
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const fecha = new Date().toISOString().slice(0, 10);
    return `tratamiento-${limpio || 'paciente'}-${fecha}.pdf`;
  }
}
