import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { PropiedadRegistroService } from './propiedad-registro-service';
import { LoginResponse } from './authInterfaz';

function servicioConUsuario(id: number, roles: string[]): PropiedadRegistroService {
  TestBed.resetTestingModule();
  const usuario = signal<LoginResponse | null>({
    token: 'token',
    id,
    nombreCompleto: 'Usuario',
    roles,
  });
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { currentUser: usuario } }],
  });
  return TestBed.inject(PropiedadRegistroService);
}

describe('PropiedadRegistroService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('permite al autor gestionar su propio registro', () => {
    const service = servicioConUsuario(7, ['Médico']);

    expect(service.puedeGestionar(7)).toBe(true);
    expect(service.puedeGestionar(8)).toBe(false);
  });

  it('permite al Administrador gestionar registros ajenos', () => {
    const service = servicioConUsuario(1, ['Administrador']);

    expect(service.puedeGestionar(999)).toBe(true);
  });

  it('el Director ya no tiene acceso global de edición', () => {
    const service = servicioConUsuario(2, ['Director']);

    expect(service.puedeGestionar(2)).toBe(true);
    expect(service.puedeGestionar(999)).toBe(false);
  });
});
