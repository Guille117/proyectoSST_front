import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ModalService } from '../../../modal-principal/modal-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { ProductoConteo } from '../data/reportes-interfaz';
import { ReportesService } from '../data/reportes-service';

import { ReporteMasVendidos } from './reporte-mas-vendidos';

describe('ReporteMasVendidos', () => {
  let fixture: ComponentFixture<ReporteMasVendidos>;
  let componente: ReporteMasVendidos;

  const datos: ProductoConteo[] = [
    { nombre: 'Paracetamol 500 mg', tipo: 'MEDICAMENTO', cantidad: 21 },
    { nombre: 'Guantes de látex', tipo: 'INSUMO', cantidad: 8 },
  ];

  const servicio = {
    productosMasVendidos: vi.fn<
      (desde?: string, hasta?: string) => Observable<ProductoConteo[]>
    >(() => of(datos)),
  };

  const popUp = {
    errorDesdeBackend: vi.fn(),
  };

  const modal = {
    open: vi.fn(),
  };

  beforeEach(async () => {
    servicio.productosMasVendidos.mockReset();
    servicio.productosMasVendidos.mockReturnValue(of(datos));
    popUp.errorDesdeBackend.mockReset();
    modal.open.mockReset();

    await TestBed.configureTestingModule({
      imports: [ReporteMasVendidos],
      providers: [
        { provide: ReportesService, useValue: servicio },
        { provide: PopUps, useValue: popUp },
        { provide: ModalService, useValue: modal },
      ],
    })
      // Las gráficas usan canvas, que jsdom no implementa; aquí solo se valida el reporte.
      .overrideComponent(ReporteMasVendidos, {
        set: {
          imports: [FormsModule, CampoValidado],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReporteMasVendidos);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('calcula totales, tipos y participación con los datos del servicio', () => {
    expect(componente.total).toBe(29);
    expect(componente.filas.length).toBe(2);
    expect(componente.filas[0].nombre).toBe('Paracetamol 500 mg');
    expect(componente.filas[0].participacion).toBeCloseTo(72.4, 1);
    expect(componente.tipos[0]).toEqual(
      expect.objectContaining({ tipo: 'MEDICAMENTO', cantidad: 21 }),
    );
    expect(componente.tipos[1]).toEqual(expect.objectContaining({ tipo: 'INSUMO', cantidad: 8 }));
  });

  it('muestra los indicadores y el detalle en la plantilla', () => {
    componente.cambiarVista('tabla');
    fixture.detectChanges();

    const contenedor = fixture.nativeElement as HTMLElement;
    const texto = contenedor.textContent ?? '';

    expect(texto).toContain('Unidades despachadas');
    expect(texto).toContain('Producto principal');
    expect(texto).toContain('Paracetamol 500 mg');
    expect(contenedor.querySelectorAll('tbody tr').length).toBe(2);
    expect(contenedor.querySelectorAll('tfoot tr').length).toBe(1);
  });

  it('conserva los datos cargados y avisa cuando la consulta falla', () => {
    servicio.productosMasVendidos.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    componente.generar();
    fixture.detectChanges();

    expect(popUp.errorDesdeBackend).toHaveBeenCalledTimes(1);
    expect(componente.filas.length).toBe(2);
    expect(componente.cargando).toBe(false);
  });

  it('bloquea las acciones mientras carga y las libera al responder', () => {
    const pendiente = new Subject<ProductoConteo[]>();
    servicio.productosMasVendidos.mockReturnValue(pendiente.asObservable());

    componente.generar();
    fixture.detectChanges();

    const botonGenerar = (fixture.nativeElement as HTMLElement).querySelector(
      '.filtros-acciones .btn',
    ) as HTMLButtonElement;

    expect(componente.cargando).toBe(true);
    expect(botonGenerar.disabled).toBe(true);

    pendiente.next(datos);
    pendiente.complete();
    fixture.changeDetectorRef.detectChanges();

    expect(componente.cargando).toBe(false);
    expect(botonGenerar.disabled).toBe(false);
  });

  it('descarta la respuesta anterior al generar de nuevo el reporte', () => {
    const primera = new Subject<ProductoConteo[]>();
    servicio.productosMasVendidos.mockReturnValueOnce(primera.asObservable());
    servicio.productosMasVendidos.mockReturnValueOnce(of(datos));

    componente.generar();
    expect(componente.cargando).toBe(true);

    componente.generar();
    expect(componente.cargando).toBe(false);
    expect(componente.filas.length).toBe(2);

    primera.next([{ nombre: 'Respuesta obsoleta', tipo: 'INSUMO', cantidad: 99 }]);
    expect(componente.filas.length).toBe(2);
    expect(componente.filas[0].nombre).toBe('Paracetamol 500 mg');
  });
});
