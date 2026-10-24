import { EpisodioActivoService } from './episodio-activo-service';

describe('EpisodioActivoService', () => {
  beforeEach(() => localStorage.clear());

  it('guarda el episodio en modo de solo lectura', () => {
    const servicio = new EpisodioActivoService();

    servicio.guardar(201, true);

    expect(servicio.obtener()).toBe(201);
    expect(servicio.esSoloLectura()).toBe(true);
  });

  it('desactiva el modo de solo lectura al abrir un episodio activo', () => {
    const servicio = new EpisodioActivoService();

    servicio.guardar(201, true);
    servicio.guardar(101);

    expect(servicio.obtener()).toBe(101);
    expect(servicio.esSoloLectura()).toBe(false);
  });

  it('conserva el modo de solo lectura tras recargar la aplicación', () => {
    new EpisodioActivoService().guardar(201, true);

    const servicio = new EpisodioActivoService();

    expect(servicio.obtener()).toBe(201);
    expect(servicio.esSoloLectura()).toBe(true);
  });

  it('limpiar olvida el episodio y el modo de solo lectura', () => {
    const servicio = new EpisodioActivoService();
    servicio.guardar(201, true);

    servicio.limpiar();

    expect(servicio.obtener()).toBeNull();
    expect(servicio.esSoloLectura()).toBe(false);
  });

  it('guarda y olvida el paciente del episodio activo', () => {
    const servicio = new EpisodioActivoService();

    servicio.guardarPaciente(7);

    expect(servicio.pacienteId()).toBe(7);

    servicio.limpiar();

    expect(servicio.pacienteId()).toBeNull();
  });
});
