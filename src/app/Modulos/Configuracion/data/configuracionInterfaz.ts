import { PersonaDatos, UsuarioResponse } from '../../Usuarios/usu/data/usuarioInterfaz';

export type PerfilConfiguracion = UsuarioResponse;
export type DatosPersonalesRequest = PersonaDatos;

export interface CambioUsuarioRequest {
  username: string;
}

export interface CambioUsuarioResponse {
  token: string;
  username: string;
}

export interface CambioPasswordRequest {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}
