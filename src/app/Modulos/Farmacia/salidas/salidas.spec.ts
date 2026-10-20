import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Salidas } from './salidas';
import { SalidasService } from './data/salidas-service';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Salidas', () => {
  let component: Salidas;
  let fixture: ComponentFixture<Salidas>;

  const resumen = {
    id: 1,
    codigo: 'SOL-00001',
    paciente: 'Ana López',
    tipoAtencion: 'EMERGENCIA',
    procedimiento: 'Sutura',
    fecha: '2026-10-19T10:00:00',
    estado: 'PENDIENTE' as const,
    medicamentos: 1,
    insumos: 0,
    pendientes: 1,
  };

  const detallePendiente = {
    id: 1,
    codigo: 'SOL-00001',
    paciente: 'Ana López',
    tipoAtencion: 'EMERGENCIA',
    procedimiento: 'Sutura',
    fecha: '2026-10-19T10:00:00',
    estado: 'PENDIENTE' as const,
    detalles: [
      {
        id: 10,
        tipo: 'MEDICAMENTO' as const,
        referenciaId: 4,
        nombre: 'Amoxicilina',
        solicitado: 10,
        entregado: 0,
        pendiente: 10,
        estado: 'PENDIENTE' as const,
        lotesDisponibles: [
          {
            id: 20,
            codigoLote: 'LOTE-20',
            fechaVencimiento: '2027-01-01',
            disponible: 5,
          },
        ],
        lotesEntregados: [],
      },
    ],
  };

  const detalleConEntrega = {
    ...detallePendiente,
    estado: 'PARCIAL' as const,
    detalles: [
      {
        ...detallePendiente.detalles[0],
        entregado: 5,
        pendiente: 5,
        estado: 'PARCIAL' as const,
        lotesEntregados: [
          {
            loteId: 20,
            codigoLote: 'LOTE-20',
            fechaVencimiento: '2027-01-01',
            entregado: 5,
            devuelto: 0,
            disponibleDevolver: 5,
          },
        ],
      },
    ],
  };

  const salidasService = {
    listar: vi.fn(),
    obtener: vi.fn(),
    entregar: vi.fn(),
    devolver: vi.fn(),
  };

  const catalogoService = {
    listar: vi.fn(),
  };

  const authService = {
    currentUser: vi.fn(() => ({ id: 1, nombreCompleto: 'Carlos Méndez' })),
  };

  const popUps = {
    exito: vi.fn(),
    advertencia: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    salidasService.listar.mockReturnValue(of([resumen]));
    salidasService.obtener.mockReturnValue(of(detallePendiente));
    salidasService.entregar.mockReturnValue(of(detalleConEntrega));
    salidasService.devolver.mockReturnValue(of(detalleConEntrega));
    catalogoService.listar.mockReturnValue(of([{ id: 7, nombre: 'Empaque dañado' }]));

    await TestBed.configureTestingModule({
      imports: [Salidas],
      providers: [
        { provide: SalidasService, useValue: salidasService },
        { provide: CatalogoService, useValue: catalogoService },
        { provide: AuthService, useValue: authService },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Salidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('carga las solicitudes, los motivos y el detalle inicial', () => {
    expect(salidasService.listar).toHaveBeenCalledWith(undefined, '');
    expect(salidasService.obtener).toHaveBeenCalledWith(1);
    expect(catalogoService.listar).toHaveBeenCalledWith('motivoBaja', true);
    expect(component.solicitudes.length).toBe(1);
    expect(component.solicitudSeleccionada?.detalles[0].loteSeleccionadoId).toBe(20);
    expect(fixture.nativeElement.textContent).toContain('Ana López');
  });

  it('debe iniciar en la vista de solicitudes', () => {
    expect(component.enDevoluciones()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Detalle de solicitud');
    expect(fixture.nativeElement.textContent).not.toContain('Guardar devolución');
  });

  it('debe cambiar a la vista de devoluciones y volver a la de solicitudes', () => {
    component.seleccionarVista(true);
    fixture.detectChanges();

    expect(component.enDevoluciones()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Detalle de devolución');
    expect(fixture.nativeElement.textContent).toContain('Guardar devolución');

    component.seleccionarVista(false);
    fixture.detectChanges();

    expect(component.enDevoluciones()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Detalle de solicitud');
  });

  it('filtra y busca solicitudes', () => {
    component.seleccionarFiltro('PARCIAL');

    expect(salidasService.listar).toHaveBeenLastCalledWith('PARCIAL', '');

    component.textoBusqueda = 'ana';
    component.buscar();

    expect(salidasService.listar).toHaveBeenLastCalledWith('PARCIAL', 'ana');
  });

  it('registra una entrega con el lote sugerido y el máximo disponible', () => {
    component.entregar();

    expect(salidasService.entregar).toHaveBeenCalledWith(1, {
      usuarioId: 1,
      lineas: [{ detalleId: 10, loteId: 20, cantidad: 5 }],
    });
    expect(popUps.exito).toHaveBeenCalledWith('Entrega registrada exitosamente.');
  });

  it('no permite entregar sin cantidades válidas', () => {
    component.solicitudSeleccionada!.detalles[0].cantidadEntrega = null;

    component.entregar();

    expect(salidasService.entregar).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalled();
  });

  it('registra una devolución de lo entregado', () => {
    salidasService.obtener.mockReturnValue(of(detalleConEntrega));
    component.cargarDetalle(1);
    fixture.detectChanges();

    const detalle = component.solicitudSeleccionada!.detalles[0];
    detalle.cantidadDevolver = 3;
    detalle.motivoBajaId = 7;

    component.devolver();

    expect(salidasService.devolver).toHaveBeenCalledWith(1, {
      usuarioId: 1,
      lineas: [
        {
          detalleId: 10,
          loteId: 20,
          cantidad: 3,
          condicion: 'APTO',
          motivoBajaId: 7,
          observacion: null,
        },
      ],
    });
    expect(popUps.exito).toHaveBeenCalledWith('Devolución registrada exitosamente.');
  });

  it('no permite devolver sin motivo', () => {
    salidasService.obtener.mockReturnValue(of(detalleConEntrega));
    component.cargarDetalle(1);
    fixture.detectChanges();

    component.solicitudSeleccionada!.detalles[0].cantidadDevolver = 3;

    component.devolver();

    expect(salidasService.devolver).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalled();
  });
});
