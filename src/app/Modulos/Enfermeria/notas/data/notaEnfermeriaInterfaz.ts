/** Cuerpo con el que se crea o actualiza una nota de enfermería. */
export interface NotaEnfermeriaRequest {
  texto: string;
  episodioId: number;
  usuarioId: number;
}

/** Nota de enfermería tal como la devuelve el backend. */
export interface NotaEnfermeriaResponse {
  id: number;
  texto: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  eliminado: boolean;
}
