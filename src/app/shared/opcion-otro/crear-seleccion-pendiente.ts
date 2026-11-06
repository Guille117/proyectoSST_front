import { OpcionOtroValor } from './opcion-otro';

export interface OpcionOtroPendiente {
  valorPendiente(): OpcionOtroValor | null;
}

export interface SeleccionPendiente {
  etiqueta: string;
  componente: () => OpcionOtroPendiente | undefined;
  crear: (valor: OpcionOtroValor) => Promise<boolean>;
}

/**
 * Crea en orden los valores capturados en los campos «Otro» que sigan abiertos.
 * Se detiene en el primer valor incompleto o creación fallida para que el
 * formulario no guarde su entidad principal.
 */
export async function crearSeleccionesPendientes(
  selecciones: SeleccionPendiente[],
  mostrarError: (mensaje: string) => void,
): Promise<boolean> {
  for (const seleccion of selecciones) {
    const valor = seleccion.componente()?.valorPendiente();
    if (!valor) {
      mostrarError(
        `Completa el valor de «${seleccion.etiqueta}» o cancélalo antes de guardar.`,
      );
      return false;
    }

    if (!(await seleccion.crear(valor))) {
      return false;
    }
  }

  return true;
}
