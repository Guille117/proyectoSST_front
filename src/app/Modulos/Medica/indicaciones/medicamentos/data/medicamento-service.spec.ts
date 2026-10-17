import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../../environments/environment';

import { MedicamentoIndicacionService } from './medicamento-service';
import { MedicamentoIndicacionRequest } from './medicamentoInterfaz';

describe('MedicamentoIndicacionService', () => {
  let service: MedicamentoIndicacionService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/medicamentos`;
  const catalogoUrl = `${environment.apiUrl}/medicamentoLog`;

  const cuerpo: MedicamentoIndicacionRequest = {
    medicamentoLogId: 9,
    cantidad: 2,
    frecuencia: 8,
    duracion: 7,
    tipoDuracion: 'DIAS',
    observaciones: 'Observación',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicamentoIndicacionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('crea la indicación con POST y cuerpo JSON', () => {
    service.postIndicacion(cuerpo).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    expect(peticion.request.headers.get('Content-Type')).toContain('application/json');
    peticion.flush({ id: 30 });
  });

  it('consulta las indicaciones por estado', () => {
    service.getIndicacionesPorEstado('ACTIVO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}?estado=ACTIVO`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('busca las indicaciones del episodio por estado', () => {
    service.getIndicacionesPorEpisodio(5, 'FINALIZADO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&estado=FINALIZADO`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('consulta una indicación por id', () => {
    service.getIndicacionPorId(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ id: 30 });
  });

  it('actualiza la indicación con PUT', () => {
    service.putIndicacion(30, cuerpo).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({ id: 30 });
  });

  it('cambia el estado con PATCH y query param', () => {
    service.cambiarEstado(30, 'FINALIZADO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30/estado?estado=FINALIZADO`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({ id: 30, estado: 'FINALIZADO' });
  });

  it('elimina la indicación con DELETE', () => {
    service.eliminarIndicacion(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });

  it('busca medicamentos activos en el catálogo por nombre', () => {
    service.buscarCatalogo('ibuprofeno').subscribe();

    const peticion = httpTesting.expectOne(
      `${catalogoUrl}/buscar?activo=true&nombre=ibuprofeno`,
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('lista el catálogo completo cuando no se escribe nombre', () => {
    service.buscarCatalogo().subscribe();

    const peticion = httpTesting.expectOne(`${catalogoUrl}/buscar?activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('consulta un medicamento del catálogo por id', () => {
    service.getCatalogoPorId(9).subscribe();

    const peticion = httpTesting.expectOne(`${catalogoUrl}/9?activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ id: 9 });
  });
});
