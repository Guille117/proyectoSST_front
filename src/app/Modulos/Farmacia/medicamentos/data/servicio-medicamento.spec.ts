import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { ServicioMedicamento } from './servicio-medicamento';

describe('ServicioMedicamento', () => {
  let service: ServicioMedicamento;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/medicamentoLog`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServicioMedicamento);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('envia activo=true en las consultas GET de medicamentos activos', () => {
    service.traerMedicamentoLog(true).subscribe();
    service.buscarMedLogActualizar(1, true).subscribe();

    const listado = httpTesting.expectOne(`${apiUrl}?activo=true`);
    const detalle = httpTesting.expectOne(`${apiUrl}/buscar/1?activo=true`);
    expect(listado.request.method).toBe('GET');
    expect(detalle.request.method).toBe('GET');
    listado.flush([]);
    detalle.flush({});
  });

  it.each([true, false])('envia el booleano activo=%s sin sustituirlo', (activo) => {
    service.traerMedicamentoLog(activo).subscribe();
    service.buscarMedLogActualizar(1, activo).subscribe();

    httpTesting.expectOne(`${apiUrl}?activo=${activo}`).flush([]);
    httpTesting.expectOne(`${apiUrl}/buscar/1?activo=${activo}`).flush({});
  });

  it('busca sin filtros usando los activos predeterminados del backend', () => {
    service.buscarMedicamentoLog().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([]);
  });

  it('combina todos los filtros en la misma busqueda', () => {
    service.buscarMedicamentoLog({
      nombre: 'amox',
      marcaId: 2,
      presentacionId: 3,
      viaAdminId: 4,
    }).subscribe();

    const peticion = httpTesting.expectOne(
      `${apiUrl}/buscar?nombre=amox&marcaId=2&presentacionId=3&viaAdminId=4`,
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('omite filtros indefinidos y conserva activo=false', () => {
    service.buscarMedicamentoLog({ nombre: undefined, marcaId: 2, activo: false }).subscribe();

    httpTesting.expectOne(`${apiUrl}/buscar?marcaId=2&activo=false`).flush([]);
  });

  it('codifica el nombre como parametro de consulta', () => {
    service.buscarMedicamentoLog({ nombre: 'Amox & clav' }).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/buscar?nombre=Amox%20%26%20clav`);
    expect(peticion.request.params.get('nombre')).toBe('Amox & clav');
    peticion.flush([]);
  });

  it('busca por ID con activo=true por defecto', () => {
    service.buscarMedLogActualizar(1).subscribe();

    httpTesting.expectOne(`${apiUrl}/buscar/1?activo=true`).flush({});
  });
});
