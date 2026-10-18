import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../../environments/environment';

import { IndicacionExamenService } from './examen-service';
import { ExamenRequest } from './examenInterfaz';

describe('IndicacionExamenService', () => {
  let service: IndicacionExamenService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/examenes`;

  const request: ExamenRequest = {
    nombreExamen: 'Hemograma',
    observacion: 'En ayunas',
    episodioId: 1,
    usuarioId: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IndicacionExamenService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('busca los exámenes del episodio por estado', () => {
    service.buscarPorEpisodio(5, 'ACTIVO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?episodioId=5&estado=ACTIVO`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('crea el examen con el request y varios archivos', () => {
    const archivos = [
      new File(['pdf'], 'hemograma.pdf', { type: 'application/pdf' }),
      new File(['png'], 'placa.png', { type: 'image/png' }),
    ];

    service.crearExamen(request, archivos).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');

    const cuerpo = peticion.request.body as FormData;
    expect(cuerpo).toBeInstanceOf(FormData);
    expect(cuerpo.get('request')).toBeInstanceOf(Blob);
    expect(cuerpo.getAll('archivos').length).toBe(2);
    peticion.flush({ id: 30 });
  });

  it('actualiza el examen con PUT y sus archivos nuevos', () => {
    service
      .actualizarExamen(30, request, [new File(['pdf'], 'resultado.pdf', { type: 'application/pdf' })])
      .subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30`);
    expect(peticion.request.method).toBe('PUT');
    expect((peticion.request.body as FormData).getAll('archivos').length).toBe(1);
    peticion.flush({ id: 30 });
  });

  it('cambia el estado con PATCH y query param', () => {
    service.cambiarEstado(30, 'ELIMINADO').subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30/estado?estado=ELIMINADO`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toBeNull();
    peticion.flush({ id: 30, estado: 'ELIMINADO' });
  });

  it('elimina un archivo del examen', () => {
    service.eliminarArchivo(30, 50).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30/archivos/50`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });

  it('obtiene el archivo como Blob', () => {
    service.obtenerArchivo(30, 50).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/30/archivos/50`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['contenido'], { type: 'application/pdf' }));
  });
});
