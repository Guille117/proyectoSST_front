/* Tipos del tratamiento global de archivos: los comparten los servicios y los formularios del sistema. */

/** Extensiones que los formularios admiten como archivo adjunto: imágenes y documentos PDF. */
export type ExtensionArchivoPermitida = 'pdf' | 'jpg' | 'jpeg' | 'png';

/** Archivo ya validado, con los datos que muestran los formularios. */
export interface ArchivoSeleccionado {
  /** Archivo original: es el que viaja al backend en la parte del multipart. */
  archivo: File;
  /** Nombre del archivo tal como lo entrega el sistema operativo. */
  nombre: string;
  /** Peso listo para mostrar, por ejemplo «1.5 MB». */
  peso: string;
  /** Extensión en minúsculas y sin el punto, por ejemplo «pdf»; vacía si el nombre no la trae. */
  extension: string;
  /** Verdadero cuando el archivo es una imagen. */
  esImagen: boolean;
  /** Clase del icono de bootstrap-icons que le corresponde. */
  icono: string;
}

/** Resultado de validar un archivo: el mensaje solo se completa cuando no se admite. */
export interface ValidacionArchivo {
  valido: boolean;
  /** Motivo del rechazo, para el popup del formulario; cadena vacía cuando el archivo se admite. */
  mensaje: string;
}

/** Resultado de procesar lo elegido en el formulario: el archivo listo o el motivo del rechazo. */
export interface ResultadoArchivo {
  /** Archivo validado listo para la vista; null cuando no había archivo o no se admitió. */
  seleccionado: ArchivoSeleccionado | null;
  /** Motivo del rechazo para el popup; null cuando no había archivo o se admitió. */
  mensaje: string | null;
}
