import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, TimeoutError, of, throwError } from 'rxjs';
import { ModalService } from '../../../../modal-principal/modal-service';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import {
  BajaLoteRequest,
  BajaLoteResponse,
  InventarioResponse,
} from '../data/interfaz-inventario';
import { ServicioInventario } from '../data/servicio-inventario';
import { ModalBajaLote } from './modal-baja-lote';

describe('ModalBajaLote', () => {
  let fixture: ComponentFixture<ModalBajaLote>;

  const catalogoService = {
    listar: vi.fn(() => of([{ id: 1, nombre: 'Producto dañado' }])),
  };
  const servicioInventario = {
    registrarBaja: vi.fn<
      (baja: BajaLoteRequest) => Observable<BajaLoteResponse>
    >(() => of({} as BajaLoteResponse)),
  };
  const authService = {
    currentUser: vi.fn<() => { id: number } | null>(() => ({ id: 2 })),
  };
  const popUps = {
    advertencia: vi.fn(),
    formIncompleto: vi.fn(),
    errorDesdeBackend: vi.fn(),
    exito: vi.fn(),
    error: vi.fn(),
  };
  const lote: InventarioResponse = {
    id: 1,
    tipo: 'MEDICAMENTO',
    idItem: 3,
    codigo: 'MED-3',
    nombre: 'Aspirina',
    descripcion: '150 mg · Ampolla · Pfizer',
    administracion: 'Oral',
    presentacion: 'Ampolla',
    cantidad: 50,
    disponible: 10,
    proveedorId: 1,
    proveedor: 'Distribuidora la Paz',
    codigoLote: 'Tk-028',
    fechaVencimiento: '2028-05-10',
    estado: true,
    idCompra: 1,
    codigoCompra: 'COM-1',
  };

  beforeEach(async () => {
    catalogoService.listar.mockReset();
    catalogoService.listar.mockReturnValue(of([{ id: 1, nombre: 'Producto dañado' }]));
    servicioInventario.registrarBaja.mockReset();
    servicioInventario.registrarBaja.mockReturnValue(of({} as BajaLoteResponse));
    authService.currentUser.mockReset();
    authService.currentUser.mockReturnValue({ id: 2 });
    popUps.advertencia.mockReset();
    popUps.formIncompleto.mockReset();
    popUps.errorDesdeBackend.mockReset();
    popUps.exito.mockReset();
    popUps.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ModalBajaLote],
      providers: [
        { provide: CatalogoService, useValue: catalogoService },
        { provide: ServicioInventario, useValue: servicioInventario },
        { provide: AuthService, useValue: authService },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalBajaLote);
  });

  it('muestra la información del lote y carga los motivos', () => {
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();

    const resumen: HTMLElement = fixture.nativeElement.querySelector('.resumen');
    expect(resumen.textContent).toContain('Aspirina');
    expect(resumen.textContent).toContain('Tk-028');
    expect(resumen.textContent).toContain('Distribuidora la Paz');
    expect(resumen.textContent).toContain('mayo 10, 2028');

    const opciones: NodeListOf<HTMLOptionElement> =
      fixture.nativeElement.querySelectorAll('#motivoBaja option');
    expect(
      Array.from(opciones).some((opcion) =>
        opcion.textContent?.includes('Producto dañado'),
      ),
    ).toBe(true);
  });

  it('valida la cantidad contra el disponible', () => {
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 11;
    fixture.componentInstance.motivoBajaId = 1;

    fixture.componentInstance.confirmar();

    expect(popUps.advertencia).toHaveBeenCalledWith(
      'La cantidad no puede superar el disponible del lote (10).',
    );
  });

  it('exige el motivo de baja', () => {
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 5;

    fixture.componentInstance.confirmar();

    expect(popUps.formIncompleto).toHaveBeenCalledWith('Seleccione un motivo de baja.');
  });

  it('exige un usuario identificado', () => {
    authService.currentUser.mockReturnValue(null);
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 5;
    fixture.componentInstance.motivoBajaId = 1;

    fixture.componentInstance.confirmar();

    expect(popUps.advertencia).toHaveBeenCalledWith(
      'No se pudo identificar al usuario de la sesión.',
    );
    expect(servicioInventario.registrarBaja).not.toHaveBeenCalled();
  });

  it('registra la baja con el contrato del backend', () => {
    const onGuardado = vi.fn();
    const modalService = TestBed.inject(ModalService);
    const cerrar = vi.spyOn(modalService, 'close');
    fixture.componentRef.setInput('lote', lote);
    fixture.componentRef.setInput('onGuardado', onGuardado);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 5;
    fixture.componentInstance.motivoBajaId = 1;
    fixture.componentInstance.observacion = '  Producto dañado  ';

    fixture.componentInstance.confirmar();

    expect(servicioInventario.registrarBaja).toHaveBeenCalledWith({
      idLote: 1,
      cantidad: 5,
      idMotivoBaja: 1,
      observacion: 'Producto dañado',
      idUsuario: 2,
    });
    expect(popUps.exito).toHaveBeenCalledWith('Baja registrada exitosamente.');
    expect(cerrar).toHaveBeenCalled();
    expect(onGuardado).toHaveBeenCalled();
  });

  it('mantiene el modal abierto si falla el registro', () => {
    servicioInventario.registrarBaja.mockReturnValue(
      throwError(() => new Error('fallo')),
    );
    const modalService = TestBed.inject(ModalService);
    const cerrar = vi.spyOn(modalService, 'close');
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 5;
    fixture.componentInstance.motivoBajaId = 1;

    fixture.componentInstance.confirmar();

    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(
      expect.any(Error),
      'No se pudo registrar la baja. Intente nuevamente.',
    );
    expect(cerrar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.guardando).toBe(false);
  });

  it('muestra el mensaje de timeout', () => {
    servicioInventario.registrarBaja.mockReturnValue(
      throwError(() => new TimeoutError()),
    );
    fixture.componentRef.setInput('lote', lote);
    fixture.detectChanges();
    fixture.componentInstance.cantidad = 5;
    fixture.componentInstance.motivoBajaId = 1;

    fixture.componentInstance.confirmar();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });
});
