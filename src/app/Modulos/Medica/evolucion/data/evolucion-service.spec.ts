import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { EvolucionService } from './evolucion-service';
import { EvolucionRequest } from './evolucionInterfaz';

describe('EvolucionService', () => {
  let service: EvolucionService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/evolucion`;

  const request: EvolucionRequest = {
    evolucionClinica: 'Paciente estable.',
    planMedico: 'Continuar tratamiento.',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EvolucionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('busca las evoluciones del episodio por estado', () => {
    service.buscarPorEpisodio(5, 'ACTIVA').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&estado=ACTIVA`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('crea la evolución con el request en JSON', () => {
    service.crear(request).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('actualiza la evolución con PUT', () => {
    service.actualizar(30, request).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('elimina la evolución con DELETE', () => {
    service.eliminar(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });
});
