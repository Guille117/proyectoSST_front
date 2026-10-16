import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { HistoriaClinicaService } from './historia-clinica-service';
import { HistoriaClinicaRequest } from './historiaClinicaInterfaz';

describe('HistoriaClinicaService', () => {
  let service: HistoriaClinicaService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/historiaClinica`;

  const cuerpo: HistoriaClinicaRequest = {
    descripcion: 'Paciente estable',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HistoriaClinicaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('crea la historia clínica con POST y cuerpo JSON', () => {
    service.postHistoria(cuerpo).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('lista por estado con activo=true por defecto', () => {
    service.getHistoriasPorEstado().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}?activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('conserva activo=false al listar por estado', () => {
    service.getHistoriasPorEstado(false).subscribe();

    httpTesting.expectOne(`${apiUrl}?activo=false`).flush([]);
  });

  it('busca por episodio enviando episodioId y activo', () => {
    service.getHistoriasPorEpisodio(5, true).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('busca por episodio conservando activo=false', () => {
    service.getHistoriasPorEpisodio(5, false).subscribe();

    httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&activo=false`).flush([]);
  });

  it('obtiene la historia clínica por ID', () => {
    service.getHistoriaPorId(7).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/7`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('actualiza la historia clínica por ID con PUT', () => {
    service.putHistoria(7, cuerpo).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/7`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('cambia el estado por ID con PATCH y sin cuerpo', () => {
    service.cambiarEstado(7).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/7`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({});
  });
});
