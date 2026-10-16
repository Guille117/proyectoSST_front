import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { DiagnosticoService } from './diagnostico-service';
import { DiagnosticoRequest } from './diagnosticoInterfaz';

describe('DiagnosticoService', () => {
  let service: DiagnosticoService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/diagnostico`;

  const cuerpo: DiagnosticoRequest = {
    tipoDiagnostico: 'PRINCIPAL',
    descripcion: 'Neumonía leve',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DiagnosticoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('crea el diagnóstico con POST y cuerpo JSON', () => {
    service.postDiagnostico(cuerpo).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('lista por estado con activo=true por defecto', () => {
    service.getDiagnosticosPorEstado().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}?activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('conserva activo=false al listar por estado', () => {
    service.getDiagnosticosPorEstado(false).subscribe();

    httpTesting.expectOne(`${apiUrl}?activo=false`).flush([]);
  });

  it('busca por episodio enviando episodioId y activo', () => {
    service.getDiagnosticosPorEpisodio(5, true).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&activo=true`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('busca por tipo enviando tipoDiagnostico y activo', () => {
    service.getDiagnosticosPorTipo('ASOCIADO', true).subscribe();

    httpTesting.expectOne(`${apiUrl}/buscar?tipoDiagnostico=ASOCIADO&activo=true`).flush([]);
  });

  it('obtiene el diagnóstico por ID', () => {
    service.getDiagnosticoPorId(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('actualiza el diagnóstico por ID con PUT', () => {
    service.putDiagnostico(30, cuerpo).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({});
  });

  it('cambia el estado por ID con PATCH y sin cuerpo', () => {
    service.cambiarEstado(30).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({});
  });
});
