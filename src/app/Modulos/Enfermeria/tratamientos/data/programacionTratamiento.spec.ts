import {
  calcularAplicaciones,
  estadoTratamiento,
  proximaAplicacion,
  ultimaAplicacionRegistrada,
  ProgramacionTratamiento,
} from './programacionTratamiento';

describe('programacionTratamiento', () => {
  const inicio = new Date(2026, 9, 20, 8, 0);
  const tratamiento: ProgramacionTratamiento = {
    fechaInicio: inicio,
    frecuencia: 8,
    duracionTipo: 'dias',
    duracionCantidad: 7,
  };

  it('genera las aplicaciones de un tratamiento por días', () => {
    const aplicaciones = calcularAplicaciones(tratamiento);

    expect(aplicaciones).toHaveLength(21);
    expect(aplicaciones[0].fechaHora.getHours()).toBe(8);
    expect(aplicaciones[1].fechaHora.getHours()).toBe(16);
    expect(aplicaciones[2].fechaHora.getDate()).toBe(21);
  });

  it('marca pendiente cuando no hay registros', () => {
    expect(estadoTratamiento(tratamiento, [], new Date(2026, 9, 20, 9, 0))).toBe('pendiente');
  });

  it('marca realizada cuando las aplicaciones vencidas tienen registro', () => {
    const ahora = new Date(2026, 9, 20, 17, 0);
    const registros = [
      { fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() },
      { fechaHoraProgramada: new Date(2026, 9, 20, 16, 0).toISOString() },
    ];

    expect(estadoTratamiento(tratamiento, registros, ahora)).toBe('realizada');
  });

  it('sigue pendiente cuando faltan aplicaciones vencidas', () => {
    const ahora = new Date(2026, 9, 20, 17, 0);
    const registros = [{ fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() }];

    expect(estadoTratamiento(tratamiento, registros, ahora)).toBe('pendiente');
  });

  it('calcula la próxima aplicación', () => {
    const proxima = proximaAplicacion(tratamiento, new Date(2026, 9, 20, 9, 0));

    expect(proxima?.getHours()).toBe(16);
  });

  it('devuelve la última aplicación registrada', () => {
    const ultima = ultimaAplicacionRegistrada([
      { fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() },
      { fechaHoraProgramada: new Date(2026, 9, 20, 16, 0).toISOString() },
    ]);

    expect(ultima?.getHours()).toBe(16);
  });

  it('genera las aplicaciones vencidas de un tratamiento indefinido', () => {
    const indefinido: ProgramacionTratamiento = {
      fechaInicio: inicio,
      frecuencia: 2,
      duracionTipo: 'indefinida',
      duracionCantidad: null,
    };

    const aplicaciones = calcularAplicaciones(indefinido, new Date(2026, 9, 20, 13, 0));

    expect(aplicaciones).toHaveLength(3);
    expect(aplicaciones[2].fechaHora.getHours()).toBe(12);
  });
});
