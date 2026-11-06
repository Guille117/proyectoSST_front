import { CONTROLES_MONITOREO, controlDeNombre } from './monitoreo';

describe('monitoreo', () => {
  it('reconoce las tres opciones de control con su sección', () => {
    expect(controlDeNombre('Signos vitales')?.seccion).toBe('signos');
    expect(controlDeNombre('Control de glucosa')?.seccion).toBe('glucosa');
    expect(controlDeNombre('Control hídrico')?.seccion).toBe('hidrico');
  });

  it('reconoce el alias Control de signos vitales', () => {
    expect(controlDeNombre('Control de signos vitales')?.seccion).toBe('signos');
  });

  it('reconoce el nombre sin acentos y con mayúsculas distintas', () => {
    expect(controlDeNombre('CONTROL HIDRICO')?.seccion).toBe('hidrico');
  });

  it('deja fuera las atenciones que no son control', () => {
    expect(controlDeNombre('Cambio de posición')).toBeNull();
  });

  it('expone los nombres de los controles para el select', () => {
    expect(CONTROLES_MONITOREO.map((control) => control.nombre)).toEqual([
      'Signos vitales',
      'Control de glucosa',
      'Control hídrico',
    ]);
  });
});
