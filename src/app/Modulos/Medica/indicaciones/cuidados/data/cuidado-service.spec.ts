import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../../environments/environment';

import { IndicacionCuidadoService } from './cuidado-service';
import { CuidadoRequest } from './cuidadoInterfaz';

describe('IndicacionCuidadoService', () => {
  let service: IndicacionCuidadoService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/cuidados`;

  const request: CuidadoRequest = {
    nombreCuidado: 'Cambio de posición',
    frecuencia: 4,
    duracion: 3,
    tipoDuracion: 'DIAS',
    observacion: 'Alternar decúbito',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IndicacionCuidadoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('busca los cuidados del episodio por estado', () => {
    service.buscarPorEpisodio(5, 'EN_PROCESO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&estado=EN_PROCESO`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('crea el cuidado con el request en JSON', () => {
    service.crearCuidado(request).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('actualiza el cuidado con PUT', () => {
    service.actualizarCuidado(30, request).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ id: 30 });
  });

  it('elimina el cuidado con DELETE', () => {
    service.eliminarCuidado(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });
});
