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

    expect(aplicaciones).toHaveLength(22);
    expect(aplicaciones[0].fechaHora.getHours()).toBe(8);
    expect(aplicaciones[1].fechaHora.getHours()).toBe(16);
    expect(aplicaciones[2].fechaHora.getDate()).toBe(21);
    expect(aplicaciones[21].fechaHora.getDate()).toBe(27);
    expect(aplicaciones[21].fechaHora.getHours()).toBe(8);
  });

  it('incluye la aplicación de cierre del tratamiento por días', () => {
    const unDia: ProgramacionTratamiento = {
      fechaInicio: new Date(2026, 9, 24, 9, 53),
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 1,
    };

    const aplicaciones = calcularAplicaciones(unDia);
    const horas = aplicaciones.map((aplicacion) =>
      `${aplicacion.fechaHora.getHours()}:${aplicacion.fechaHora
        .getMinutes()
        .toString()
        .padStart(2, '0')}`,
    );

    expect(horas).toEqual(['9:53', '17:53', '1:53', '9:53']);
  });

  it('marca pendiente cuando no hay registros', () => {
    expect(estadoTratamiento(tratamiento, [], new Date(2026, 9, 20, 9, 0))).toBe('pendiente');
  });

  it('sigue pendiente aunque las aplicaciones vencidas ya tengan registro', () => {
    const ahora = new Date(2026, 9, 20, 17, 0);
    const registros = [
      { fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() },
      { fechaHoraProgramada: new Date(2026, 9, 20, 16, 0).toISOString() },
    ];

    expect(estadoTratamiento(tratamiento, registros, ahora)).toBe('pendiente');
  });

  it('sigue pendiente cuando faltan aplicaciones vencidas', () => {
    const ahora = new Date(2026, 9, 20, 17, 0);
    const registros = [{ fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() }];

    expect(estadoTratamiento(tratamiento, registros, ahora)).toBe('pendiente');
  });

  it('marca realizada solo cuando todas las aplicaciones tienen registro', () => {
    const registros = calcularAplicaciones(tratamiento).map((aplicacion) => ({
      fechaHoraProgramada: aplicacion.fechaHora.toISOString(),
    }));

    expect(estadoTratamiento(tratamiento, registros, new Date(2026, 9, 20, 9, 0))).toBe(
      'realizada',
    );
  });

  it('mantiene pendiente un tratamiento indefinido', () => {
    const indefinido: ProgramacionTratamiento = {
      fechaInicio: inicio,
      frecuencia: 2,
      duracionTipo: 'indefinida',
      duracionCantidad: null,
    };
    const ahora = new Date(2026, 9, 20, 13, 0);
    const registros = calcularAplicaciones(indefinido, ahora).map((aplicacion) => ({
      fechaHoraProgramada: aplicacion.fechaHora.toISOString(),
    }));

    expect(estadoTratamiento(indefinido, registros, ahora)).toBe('pendiente');
  });

  it('muestra la primera aplicación pendiente aunque ya haya pasado su hora', () => {
    const proxima = proximaAplicacion(tratamiento, [], new Date(2026, 9, 20, 9, 0));

    expect(proxima?.getHours()).toBe(8);
  });

  it('pasa a la siguiente aplicación cuando la primera ya se registró', () => {
    const registros = [
      { fechaHoraProgramada: new Date(2026, 9, 20, 8, 0).toISOString() },
    ];

    const proxima = proximaAplicacion(tratamiento, registros, new Date(2026, 9, 20, 9, 0));

    expect(proxima?.getHours()).toBe(16);
  });

  it('devuelve la fecha real de registro de la última aplicación', () => {
    const ultima = ultimaAplicacionRegistrada([
      {
        fechaHoraProgramada: new Date(2026, 9, 20, 6, 52).toISOString(),
        fechaRegistro: new Date(2026, 9, 20, 10, 31).toISOString(),
      },
    ]);

    expect(ultima?.getHours()).toBe(10);
    expect(ultima?.getMinutes()).toBe(31);
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
