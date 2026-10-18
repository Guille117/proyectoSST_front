export type TipoDocumentoEpisodio =
  | 'REFERENCIA'
  | 'AUTORIZACION_PROCEDIMIENTO'
  | 'RESPONSABILIDAD';

export interface DocumentoEpisodio {
  id: number;
  tipo: TipoDocumentoEpisodio;
  nombreOriginal: string;
  urlArchivo: string;
  fechaSubida: string;
  usuarioId: number;
  usuarioNombre: string;
  estado: boolean;
}
