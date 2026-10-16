import { Injectable } from '@angular/core';

import {
  ArchivoSeleccionado,
  ExtensionArchivoPermitida,
  ResultadoArchivo,
  ValidacionArchivo,
} from './archivoInterfaz';

/**
 * Tratamiento global de los archivos que se adjuntan en los formularios del sistema (imágenes y PDF):
 * valida el formato y el peso, describe lo seleccionado para la vista y arma la parte del multipart
 * que se envía al backend. La vista guarda el archivo que devuelve `procesar` y el servicio del
 * formulario lo adjunta a la petición con `agregarAlFormData`.
 *
 * No guarda estado: cada formulario conserva su propio archivo y así un adjunto no se mezcla con el
 * de otra pantalla.
 */
@Injectable({
  providedIn: 'root',
})
export class ArchivoService {
  /** Extensiones admitidas en los formularios: imágenes y documentos PDF. */
  readonly extensionesPermitidas: ExtensionArchivoPermitida[] = ['pdf', 'jpg', 'jpeg', 'png'];

  /** Peso máximo admitido por archivo, en MB. */
  readonly tamanoMaximoMb = 10;

  /** Tipos MIME que los navegadores asignan a las extensiones admitidas. */
  private readonly tiposMime: Record<ExtensionArchivoPermitida, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };

  /** Valor del atributo `accept` de los input de archivo: evita repetir la lista en cada plantilla. */
  get aceptados(): string {
    return this.extensionesPermitidas.map((extension) => `.${extension}`).join(',');
  }

  /** Extrae el archivo de un evento de selección (`change`) o de arrastre (`drop`). */
  extraerArchivo(evento: Event): File | null {
    const arrastre = evento as DragEvent;
    const archivos =
      arrastre.dataTransfer?.files ?? (evento.target as HTMLInputElement | null)?.files ?? null;

    return archivos?.[0] ?? null;
  }

  /** Procesa el evento del input de archivo: extrae lo elegido, lo valida y lo describe. */
  procesar(evento: Event): ResultadoArchivo {
    return this.procesarArchivo(this.extraerArchivo(evento));
  }

  /** Valida el archivo y lo describe para la vista; sin archivo devuelve un resultado vacío. */
  procesarArchivo(archivo: File | null | undefined): ResultadoArchivo {
    if (!archivo) {
      return { seleccionado: null, mensaje: null };
    }

    const validacion = this.validar(archivo);

    return validacion.valido
      ? { seleccionado: this.describir(archivo), mensaje: null }
      : { seleccionado: null, mensaje: validacion.mensaje };
  }

  /** Comprueba el formato y el peso del archivo antes de adjuntarlo. */
  validar(archivo: File): ValidacionArchivo {
    if (!this.esFormatoPermitido(archivo)) {
      return {
        valido: false,
        mensaje: 'Formato no permitido. Solo se admiten imágenes JPG o PNG y documentos PDF.',
      };
    }

    if (archivo.size > this.tamanoMaximoMb * 1024 * 1024) {
      return {
        valido: false,
        mensaje: `El archivo supera el tamaño máximo de ${this.tamanoMaximoMb} MB.`,
      };
    }

    return { valido: true, mensaje: '' };
  }

  /** Datos que muestran los formularios del archivo ya admitido. */
  describir(archivo: File): ArchivoSeleccionado {
    return {
      archivo,
      nombre: archivo.name,
      peso: this.pesoLegible(archivo.size),
      extension: this.extension(archivo),
      esImagen: this.esImagen(archivo),
      icono: this.icono(archivo),
    };
  }

  /** Adjunta el archivo a la parte del multipart que espera el backend. */
  agregarAlFormData(datos: FormData, campo: string, archivo: File | null | undefined): void {
    if (archivo) {
      datos.append(campo, archivo);
    }
  }

  /** Peso del archivo en la unidad que le corresponde: B, KB o MB con un solo decimal. */
  pesoLegible(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kilobytes = bytes / 1024;

    return kilobytes < 1024
      ? `${this.redondear(kilobytes)} KB`
      : `${this.redondear(kilobytes / 1024)} MB`;
  }

  /** Extensión del archivo en minúsculas y sin el punto; vacía cuando el nombre no la trae. */
  extension(archivo: File): string {
    const punto = archivo.name.lastIndexOf('.');

    return punto > 0 ? archivo.name.slice(punto + 1).toLowerCase() : '';
  }

  /** Verdadero cuando el archivo es una imagen. */
  esImagen(archivo: File): boolean {
    return archivo.type.startsWith('image/') || this.esImagenPorExtension(archivo);
  }

  /** Clase del icono que representa al archivo según su tipo. */
  icono(archivo: File): string {
    if (this.esImagen(archivo)) {
      return 'bi-file-earmark-image';
    }

    return this.extension(archivo) === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-text';
  }

  /**
   * El navegador de escritorio informa el tipo MIME del archivo; se admite también por extensión
   * porque hay sistemas que entregan un tipo genérico (application/octet-stream) a un PDF o a una
   * imagen válidos.
   */
  private esFormatoPermitido(archivo: File): boolean {
    const tiposAdmitidos = Object.values(this.tiposMime);

    return (
      (Boolean(archivo.type) && tiposAdmitidos.includes(archivo.type.toLowerCase())) ||
      this.extensionesPermitidas.includes(this.extension(archivo) as ExtensionArchivoPermitida)
    );
  }

  /** Extensión que corresponde a una imagen, para los archivos que llegan sin tipo MIME. */
  private esImagenPorExtension(archivo: File): boolean {
    const imagenPorExtension: ExtensionArchivoPermitida[] = ['jpg', 'jpeg', 'png'];

    return imagenPorExtension.includes(this.extension(archivo) as ExtensionArchivoPermitida);
  }

  /** Redondea a un decimal y quita el cero sobrante: «2 MB» en lugar de «2.0 MB». */
  private redondear(valor: number): string {
    return valor.toFixed(1).replace(/\.0$/, '');
  }
}
