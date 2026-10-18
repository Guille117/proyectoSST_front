import { Observable } from 'rxjs';

/** Archivo que el visor puede mostrar y administrar. */
export interface ArchivoVisor {
  /** Identificador del archivo en el backend o clave de la fuente. */
  id: number | string;
  /** Nombre con el que se muestra y se descarga. */
  nombreOriginal: string;
  /** Tipo MIME, cuando la fuente lo conoce. */
  tipo?: string | null;
  /** Tamaño en bytes, cuando la fuente lo conoce. */
  tamano?: number | null;
}

/** Carga autenticada del contenido del archivo. */
export type CargarArchivoVisor = (archivo: ArchivoVisor) => Observable<Blob>;

/** Elimina el archivo actual; el visor solo muestra la acción cuando se recibe. */
export type EliminarArchivoVisor = (archivo: ArchivoVisor) => Observable<void>;
