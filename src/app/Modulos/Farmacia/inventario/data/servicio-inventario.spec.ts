import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';

import { ServicioInventario } from './servicio-inventario';

describe('ServicioInventario', () => {
  let service: ServicioInventario;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/lotes/inventario`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServicioInventario);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('consulta el inventario con los filtros indicados', () => {
    service
      .listarInventario({
        tipo: 'medicamento',
        nombre: 'amox',
        proveedorId: 3,
        viaAdminId: 2,
        estadoInventario: 'por-vencer',
        activos: true,
        diasPorVencer: 30,
      })
      .subscribe();

    const peticion = httpTesting.expectOne((request) => request.url === apiUrl);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('tipo')).toBe('medicamento');
    expect(peticion.request.params.get('nombre')).toBe('amox');
    expect(peticion.request.params.get('proveedorId')).toBe('3');
    expect(peticion.request.params.get('viaAdminId')).toBe('2');
    expect(peticion.request.params.get('estadoInventario')).toBe('por-vencer');
    expect(peticion.request.params.get('activos')).toBe('true');
    expect(peticion.request.params.get('diasPorVencer')).toBe('30');
    peticion.flush([]);
  });

  it('registra la baja con POST en /bajas', () => {
    const baja = {
      idLote: 1,
      cantidad: 5,
      idMotivoBaja: 1,
      observacion: 'Producto dañado',
      idUsuario: 2,
    };

    service.registrarBaja(baja).subscribe();

    const peticion = httpTesting.expectOne(`${environment.apiUrl}/bajas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(baja);
    peticion.flush({
      id: 1,
      idLote: 1,
      codigoLote: 'Tk-028',
      cantidad: 5,
      stockAnterior: 10,
      stockActual: 5,
      idMotivoBaja: 1,
      motivo: 'Producto dañado',
      observacion: 'Producto dañado',
      fechaHora: '2026-10-17T10:00:00',
      idUsuario: 2,
      usuario: 'admin',
    });
  });

  it('lista las bajas filtradas por tipo en /bajas', () => {
    service.listarBajas('insumo').subscribe();

    const peticion = httpTesting.expectOne((request) => request.url === `${environment.apiUrl}/bajas`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('tipo')).toBe('insumo');
    peticion.flush([]);
  });

  it('revierte una baja con DELETE en /bajas/{id}', () => {
    service.revertirBaja(3).subscribe();

    const peticion = httpTesting.expectOne(`${environment.apiUrl}/bajas/3`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });

  it('omite los filtros no definidos', () => {
    service.listarInventario({ tipo: 'insumo', activos: true }).subscribe();

    const peticion = httpTesting.expectOne((request) => request.url === apiUrl);
    expect(peticion.request.params.get('tipo')).toBe('insumo');
    expect(peticion.request.params.get('activos')).toBe('true');
    expect(peticion.request.params.has('nombre')).toBe(false);
    expect(peticion.request.params.has('proveedorId')).toBe(false);
    expect(peticion.request.params.has('viaAdminId')).toBe(false);
    expect(peticion.request.params.has('estadoInventario')).toBe(false);
    peticion.flush([]);
  });
});
