import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { AltaService } from './alta-service';
import { AltaRequest } from './altaInterfaz';

describe('AltaService', () => {
  let service: AltaService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/altas`;

  const request: AltaRequest = {
    tipoAlta: 'INDICACION_MEDICA',
    diagnosticoEgreso: 'Diagnóstico de egreso',
    condicionEgresoId: 2,
    observacionEgreso: 'Observación',
    episodioId: 1,
    usuarioId: 2,
    responsableRetiro: null,
    motivoRetiro: null,
    riesgosRetiro: [],
    institucionId: null,
    motivoReferencia: null,
    indicacionesTraslado: null,
    tratamientos: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AltaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('busca el alta vigente del episodio', () => {
    service.buscarPorEpisodio(5).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('consulta las altas de las últimas 48 horas', () => {
    service.recientes(48).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/recientes?horas=48`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('crea el alta con el request en JSON', () => {
    service.crear(request).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('actualiza el alta con PUT', () => {
    service.actualizar(30, request).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('anula el alta con DELETE', () => {
    service.anular(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });
});
