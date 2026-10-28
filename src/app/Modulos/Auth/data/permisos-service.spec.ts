import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { PermisosService } from './permisos-service';
import { LoginResponse, PermisoAuth } from './authInterfaz';

function permiso(modulo: string, submodulo: string, flags: Partial<PermisoAuth> = {}): PermisoAuth {
  return {
    submoduloId: 1,
    submoduloCodigo: submodulo,
    submoduloNombre: submodulo,
    moduloCodigo: modulo,
    moduloNombre: modulo,
    puedeLeer: true,
    puedeCrear: false,
    puedeEditar: false,
    puedeEliminar: false,
    ...flags,
  };
}

function servicioCon(permisos: PermisoAuth[]): PermisosService {
  TestBed.resetTestingModule();
  const usuario = signal<LoginResponse | null>({
    token: 'token',
    id: 1,
    nombreCompleto: 'Usuario',
    permisos,
  });
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { currentUser: usuario } }],
  });
  return TestBed.inject(PermisosService);
}

describe('PermisosService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('detecta solo lectura por módulo', () => {
    const service = servicioCon([
      permiso('MEDICA', 'MED-ATENCION'),
      permiso('FARMACIA', 'PROVEEDORES', { puedeCrear: true }),
    ]);

    expect(service.soloLecturaModulo('MEDICA')).toBe(true);
    expect(service.soloLecturaModulo('FARMACIA')).toBe(false);
  });

  it('distingue catálogos por submódulo', () => {
    const service = servicioCon([
      permiso('CATALOGOS', 'CATALOGOS-CLINICA'),
      permiso('CATALOGOS', 'CATALOGOS-PACIENTES'),
    ]);

    expect(service.puedeLeerSubmodulo('CATALOGOS-CLINICA')).toBe(true);
    expect(service.puedeLeerSubmodulo('CATALOGOS-FARMACIA')).toBe(false);
    expect(service.tieneAlgunCatalogo()).toBe(true);
  });

  it('elige la primera ruta permitida', () => {
    expect(servicioCon([permiso('FARMACIA', 'PROVEEDORES')]).rutaInicio()).toBe('/farmacia');
    expect(servicioCon([permiso('MEDICA', 'MED-ATENCION')]).rutaInicio()).toBe('/medica');
    expect(servicioCon([permiso('ENFERMERIA', 'ENF-MONITOREO')]).rutaInicio()).toBe('/enfermeria');
    expect(servicioCon([permiso('CATALOGOS', 'CATALOGOS-CLINICA')]).rutaInicio()).toBe('/catalogos');
  });
});
