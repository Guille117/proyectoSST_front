import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { DocumentoEpisodioService } from '../data/documento-episodio-service';
import { DocumentoEpisodio } from '../data/documentoInterfaz';
import { ModalDocumentosPaciente } from './modal-documentos-paciente';

describe('ModalDocumentosPaciente', () => {
  let component: ModalDocumentosPaciente;
  let fixture: ComponentFixture<ModalDocumentosPaciente>;

  const documentos: DocumentoEpisodio[] = [
    {
      id: 10,
      tipo: 'REFERENCIA',
      nombreOriginal: 'referencia.pdf',
      urlArchivo: 'uploads/documentos/referencia.pdf',
      fechaSubida: '2026-10-10T09:00:00',
      usuarioId: 5,
      usuarioNombre: 'Ana López',
      estado: true,
    },
    {
      id: 11,
      tipo: 'REFERENCIA',
      nombreOriginal: 'radiografia.png',
      urlArchivo: 'uploads/documentos/radiografia.png',
      fechaSubida: '2026-10-10T10:00:00',
      usuarioId: 5,
      usuarioNombre: 'Ana López',
      estado: true,
    },
  ];

  const servicioDocumento = {
    obtenerArchivo: vi.fn(() => of(new Blob(['contenido'], { type: 'application/pdf' }))),
    eliminarDocumento: vi.fn(() => of(void 0)),
  };

  const modalService = { close: vi.fn() };
  const onCambio = vi.fn();

  const modalPopUps = {
    confirmarToast: vi.fn(async () => true),
    exito: vi.fn(async () => {}),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    servicioDocumento.obtenerArchivo.mockReturnValue(
      of(new Blob(['contenido'], { type: 'application/pdf' })),
    );
    servicioDocumento.eliminarDocumento.mockReturnValue(of(void 0));
    modalPopUps.confirmarToast.mockResolvedValue(true);
    modalPopUps.exito.mockResolvedValue(undefined);

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:documento'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [ModalDocumentosPaciente],
      providers: [
        { provide: DocumentoEpisodioService, useValue: servicioDocumento },
        { provide: ModalService, useValue: modalService },
        { provide: ModalPopUps, useValue: modalPopUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocumentosPaciente);
    component = fixture.componentInstance;
    component.documentos = [...documentos];
    component.onCambio = onCambio;
    fixture.detectChanges();
  });

  it('carga el primer documento del tipo', () => {
    expect(component.documentoActual?.id).toBe(10);
    expect(component.indice()).toBe(0);
    expect(servicioDocumento.obtenerArchivo).toHaveBeenCalledWith(10);
    expect(component.esImagen()).toBe(false);
  });

  it('recorre los documentos con las flechas', () => {
    component.siguiente();

    expect(component.documentoActual?.id).toBe(11);
    expect(servicioDocumento.obtenerArchivo).toHaveBeenCalledWith(11);
    expect(component.puedeSiguiente).toBe(false);

    component.anterior();

    expect(component.documentoActual?.id).toBe(10);
  });

  it('elimina el documento actual después de confirmar y avisa al padre', async () => {
    await component.eliminar();

    expect(modalPopUps.confirmarToast).toHaveBeenCalled();
    expect(servicioDocumento.eliminarDocumento).toHaveBeenCalledWith(10);
    expect(component.documentos.map((item) => item.id)).toEqual([11]);
    expect(onCambio).toHaveBeenCalled();
    expect(modalService.close).not.toHaveBeenCalled();
  });

  it('cierra el modal cuando se elimina el último documento', async () => {
    component.documentos = [documentos[0]];
    await component.eliminar();

    expect(modalService.close).toHaveBeenCalled();
  });

  it('no elimina cuando el usuario cancela la confirmación', async () => {
    modalPopUps.confirmarToast.mockResolvedValueOnce(false);

    await component.eliminar();

    expect(servicioDocumento.eliminarDocumento).not.toHaveBeenCalled();
  });
});
