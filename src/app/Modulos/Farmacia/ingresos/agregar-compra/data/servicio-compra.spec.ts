import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';

import { CompraRequest } from './interfaz-compra';
import { ServicioCompra } from './servicio-compra';

describe('ServicioCompra', () => {
  let service: ServicioCompra;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/compras`;

  const request: CompraRequest = {
    proveedorId: 1,
    lotes: [
      {
        esMedicamento: true,
        idItem: 3,
        codigoLote: 'AMOX-2026-01',
        cantidad: 100,
        fechaVencimiento: '2027-06-30',
        precioCompra: 10.5,
        precioVenta: 15,
      },
      {
        esMedicamento: false,
        idItem: 7,
        codigoLote: 'JERING-2026-01',
        cantidad: 50,
        fechaVencimiento: '2028-01-15',
        precioCompra: 8,
        precioVenta: 12,
      },
    ],
  };

  const comprobante = new File(['contenido del comprobante'], 'factura-001.pdf', {
    type: 'application/pdf',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServicioCompra);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('registra la compra con POST multipart en /compras: request (JSON) y comprobante (archivo)', async () => {
    service.registrarCompra({ request, comprobante }).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.url).toBe(apiUrl);
    expect(peticion.request.responseType).toBe('json');

    const body = peticion.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);

    // El JSON viaja sin transformar en la parte `request`
    const parteRequest = body.get('request') as Blob;
    expect(parteRequest).toBeInstanceOf(Blob);
    expect(parteRequest.type).toBe('application/json');
    expect(JSON.parse(await parteRequest.text())).toEqual(request);

    // El archivo viaja completo en la parte `comprobante`
    const parteComprobante = body.get('comprobante') as File;
    expect(parteComprobante).toBeInstanceOf(File);
    expect(parteComprobante.name).toBe('factura-001.pdf');
    expect(parteComprobante.type).toBe('application/pdf');

    // Sin Content-Type manual: el navegador agrega multipart/form-data con su boundary
    expect(peticion.request.headers.get('Content-Type')).toBeNull();

    peticion.flush(null);
  });

  it('omite la parte comprobante cuando no hay archivo seleccionado', () => {
    service.registrarCompra({ request, comprobante: null }).subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    const body = peticion.request.body as FormData;
    expect(body.get('request')).not.toBeNull();
    expect(body.get('comprobante')).toBeNull();

    peticion.flush(null);
  });

  it('consulta el resumen de compras en /compras/resumen', () => {
    service.listarComprasResumen().subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/resumen`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('consulta el detalle de compras en /compras', () => {
    service.listarCompras().subscribe();

    const peticion = httpTesting.expectOne(apiUrl);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('busca compras con los filtros en /compras/resumen/buscar', () => {
    service
      .buscarComprasResumen({
        codigo: 'COM',
        proveedorId: 3,
        fecha: '2026-10-16',
        activos: true,
      })
      .subscribe();

    const peticion = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/resumen/buscar`,
    );
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('codigo')).toBe('COM');
    expect(peticion.request.params.get('proveedorId')).toBe('3');
    expect(peticion.request.params.get('fecha')).toBe('2026-10-16');
    expect(peticion.request.params.get('activos')).toBe('true');
    peticion.flush([]);
  });

  it('elimina la compra con DELETE en /compras/{id}', () => {
    service.eliminarCompra(1).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });

  it('actualiza la compra con PUT multipart en /compras/{id}', async () => {
    service.actualizarCompra(1, { request, comprobante }).subscribe();

    const peticion = httpTesting.expectOne(`${apiUrl}/1`);
    expect(peticion.request.method).toBe('PUT');

    const body = peticion.request.body as FormData;
    const parteRequest = body.get('request') as Blob;
    expect(JSON.parse(await parteRequest.text())).toEqual(request);
    expect(body.get('comprobante')).toBeInstanceOf(File);

    peticion.flush(null);
  });

  it('descarga el comprobante como Blob con la URL indicada', () => {
    const url = `${apiUrl}/1/comprobante`;

    service.obtenerComprobante(url).subscribe();

    const peticion = httpTesting.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['contenido'], { type: 'application/pdf' }));
  });

  it('realiza una unica peticion por compra enviada', () => {
    service.registrarCompra({ request, comprobante }).subscribe();

    // match() retira las peticiones coincidentes de las pendientes
    const peticiones = httpTesting.match(apiUrl);
    expect(peticiones).toHaveLength(1);
    peticiones[0].flush(null);
  });
});
