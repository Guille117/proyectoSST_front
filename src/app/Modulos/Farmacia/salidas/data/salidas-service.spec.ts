import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';

import { SalidasService } from './salidas-service';

describe('SalidasService', () => {
  let service: SalidasService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/solicitudesSalida`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SalidasService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('lista las solicitudes con estado y texto', () => {
    service.listar('PARCIAL', 'ana').subscribe();

    const peticion = httpTesting.expectOne((request) => request.url === apiUrl);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('estado')).toBe('PARCIAL');
    expect(peticion.request.params.get('texto')).toBe('ana');
    peticion.flush([]);
  });

  it('omite los filtros vacíos al listar', () => {
    service.listar(undefined, '   ').subscribe();

    const peticion = httpTesting.expectOne((request) => request.url === apiUrl);
    expect(peticion.request.params.has('estado')).toBe(false);
    expect(peticion.request.params.has('texto')).toBe(false);
    peticion.flush([]);
  });

  it('obtiene el detalle de una solicitud', () => {
    service.obtener(3).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/3`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({});
  });

  it('registra una entrega con POST', () => {
    const request = { usuarioId: 1, lineas: [{ detalleId: 10, loteId: 20, cantidad: 5 }] };

    service.entregar(3, request).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/3/entregas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({});
  });

  it('registra una devolución con POST', () => {
    const request = {
      usuarioId: 1,
      lineas: [
        {
          detalleId: 10,
          loteId: 20,
          cantidad: 2,
          condicion: 'APTO' as const,
          motivoBajaId: 7,
          observacion: null,
        },
      ],
    };

    service.devolver(3, request).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/3/devoluciones`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({});
  });

  it('registra una salida directa con POST', () => {
    const request = {
      episodioId: 10,
      usuarioId: 1,
      lineas: [{ tipo: 'MEDICAMENTO' as const, referenciaId: 4, cantidad: 3, loteId: 20 }],
    };

    service.crearDirecta(request).subscribe();

    const peticion = httpTesting.expectOne(`${environment.apiUrl}/salidasDirectas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({});
  });

  it('obtiene el historial de una salida', () => {
    service.historial(3).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/3/historial`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });
});
