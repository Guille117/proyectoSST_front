export type TipoDocumentoEpisodio =
  | 'REFERENCIA'
  | 'AUTORIZACION_PROCEDIMIENTO'
  | 'RESPONSABILIDAD'
  | 'ALTA_MEDICA'
  | 'RECETA';

export interface DocumentoEpisodio {
  id: number;
  tipo: TipoDocumentoEpisodio;
  nombreOriginal: string;
  urlArchivo: string;
  fechaSubida: string;
  usuarioId: number;
  usuarioNombre: string;
  estado: boolean;
  procedimientoMedicoId: number | null;
  altaId: number | null;
}
