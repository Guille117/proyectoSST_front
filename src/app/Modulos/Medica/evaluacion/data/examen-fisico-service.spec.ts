import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { ExamenFisicoService } from './examen-fisico-service';
import { ExamenFisicoRequest } from './examenFisicoInterfaz';

describe('ExamenFisicoService', () => {
  let service: ExamenFisicoService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/examenFisico`;
  const apiUrlPartesCuerpo = `${environment.apiUrl}/partesCuerpo`;

  const cuerpo: ExamenFisicoRequest = {
    descripcion: 'Ruidos cardiacos normales',
    episodioId: 1,
    parteCuerpoId: 3,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamenFisicoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('lista el catálogo de partes del cuerpo con activos=true por defecto', () => {
    service.getPartesCuerpo().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrlPartesCuerpo}?activos=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('conserva activos=false al listar las partes del cuerpo', () => {
    service.getPartesCuerpo(false).subscribe();

    httpTesting.expectOne(`${apiUrlPartesCuerpo}?activos=false`).flush([]);
  });

  it('crea el examen físico con POST y cuerpo JSON', () => {
    service.postExamen(cuerpo).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('lista por estado con activo=true por defecto', () => {
    service.getExamenesPorEstado().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}?activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('conserva activo=false al listar por estado', () => {
    service.getExamenesPorEstado(false).subscribe();

    httpTesting.expectOne(`${apiUrl}?activo=false`).flush([]);
  });

  it('busca por episodio enviando episodioId y activo', () => {
    service.getExamenesPorEpisodio(5, true).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('busca por parte del cuerpo enviando parteCuerpoId y activo', () => {
    service.getExamenesPorParteCuerpo(4, false).subscribe();

    httpTesting.expectOne(`${apiUrl}/buscar?parteCuerpoId=4&activo=false`).flush([]);
  });

  it('obtiene el examen físico por ID', () => {
    service.getExamenPorId(20).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/20`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('actualiza el examen físico por ID con PUT', () => {
    service.putExamen(20, cuerpo).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/20`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('cambia el estado por ID con PATCH y sin cuerpo', () => {
    service.cambiarEstado(20).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/20`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({});
  });
});
