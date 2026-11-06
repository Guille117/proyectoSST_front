import { crearSeleccionesPendientes, OpcionOtroPendiente } from './crear-seleccion-pendiente';

function pendiente(valor: { nombre: string; abreviatura?: string } | null): OpcionOtroPendiente {
  return { valorPendiente: () => valor };
}

describe('crearSeleccionesPendientes', () => {
  it('crea los valores pendientes en orden', async () => {
    const llamadas: string[] = [];
    const resultado = await crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Puesto',
          componente: () => pendiente({ nombre: 'Enfermero' }),
          crear: async (valor) => {
            llamadas.push(`puesto:${valor.nombre}`);
            return true;
          },
        },
        {
          etiqueta: 'Especialidad',
          componente: () => pendiente({ nombre: 'Cardiología' }),
          crear: async (valor) => {
            llamadas.push(`especialidad:${valor.nombre}`);
            return true;
          },
        },
      ],
      () => undefined,
    );

    expect(resultado).toBe(true);
    expect(llamadas).toEqual(['puesto:Enfermero', 'especialidad:Cardiología']);
  });

  it('no crea nada cuando un valor pendiente está incompleto', async () => {
    const crear = vi.fn(async () => true);
    const error = vi.fn();

    const resultado = await crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Puesto',
          componente: () => pendiente(null),
          crear,
        },
      ],
      error,
    );

    expect(resultado).toBe(false);
    expect(crear).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Completa el valor de «Puesto» o cancélalo antes de guardar.',
    );
  });

  it('se detiene cuando falla una creación y no ejecuta las siguientes', async () => {
    const primera = vi.fn(async () => true);
    const segunda = vi.fn(async () => false);
    const tercera = vi.fn(async () => true);

    const resultado = await crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Primera',
          componente: () => pendiente({ nombre: 'A' }),
          crear: primera,
        },
        {
          etiqueta: 'Segunda',
          componente: () => pendiente({ nombre: 'B' }),
          crear: segunda,
        },
        {
          etiqueta: 'Tercera',
          componente: () => pendiente({ nombre: 'C' }),
          crear: tercera,
        },
      ],
      () => undefined,
    );

    expect(resultado).toBe(false);
    expect(primera).toHaveBeenCalledTimes(1);
    expect(segunda).toHaveBeenCalledTimes(1);
    expect(tercera).not.toHaveBeenCalled();
  });

  it('no continúa si el componente pendiente no está disponible', async () => {
    const crear = vi.fn(async () => true);
    const error = vi.fn();

    const resultado = await crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Puesto',
          componente: () => undefined,
          crear,
        },
      ],
      error,
    );

    expect(resultado).toBe(false);
    expect(crear).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Completa el valor de «Puesto» o cancélalo antes de guardar.',
    );
  });
});
