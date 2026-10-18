import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';
import { ModalService } from '../../modal-principal/modal-service';
import { ModalPopUps } from '../popUps/modal-popUpsService';
import { VisorArchivos } from './visor-archivos';
import { ArchivoVisor, CargarArchivoVisor, EliminarArchivoVisor } from './visor-archivos.interfaz';

describe('VisorArchivos', () => {
  let fixture: ComponentFixture<VisorArchivos>;
  let component: VisorArchivos;

  const pdf: ArchivoVisor = { id: 1, nombreOriginal: 'informe.pdf' };
  const imagen: ArchivoVisor = { id: 2, nombreOriginal: 'foto.png' };
  const word: ArchivoVisor = { id: 3, nombreOriginal: 'documento.docx' };

  const modalService = { close: vi.fn() };
  const modalPopUps = {
    confirmarToast: vi.fn(async () => true),
    exito: vi.fn(async () => {}),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  const cargarPdf: CargarArchivoVisor = () =>
    of(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
  const cargarImagen: CargarArchivoVisor = () =>
    of(new Blob(['png'], { type: 'image/png' }));
  const cargarWord: CargarArchivoVisor = () =>
    of(
      new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

  const crear = async (
    archivos: ArchivoVisor[],
    cargarArchivo: CargarArchivoVisor,
    onEliminar?: EliminarArchivoVisor,
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [VisorArchivos],
      providers: [
        { provide: ModalService, useValue: modalService },
        { provide: ModalPopUps, useValue: modalPopUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisorArchivos);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('archivos', archivos);
    fixture.componentRef.setInput('cargarArchivo', cargarArchivo);
    if (onEliminar) fixture.componentRef.setInput('onEliminar', onEliminar);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    modalPopUps.confirmarToast.mockResolvedValue(true);
    modalPopUps.exito.mockResolvedValue(undefined);

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:archivo'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
  });

  it('muestra un PDF con el visor nativo del navegador', async () => {
    await crear([pdf], cargarPdf);

    expect(component.tipo()).toBe('pdf');
    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF');
  });

  it('muestra una imagen y permite ajustar el zoom', async () => {
    await crear([imagen], cargarImagen);

    const contenido = fixture.nativeElement.querySelector('.contenido') as HTMLElement;
    const elementoImagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    Object.defineProperty(contenido, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(contenido, 'clientHeight', { value: 800, configurable: true });
    Object.defineProperty(elementoImagen, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(elementoImagen, 'naturalHeight', { value: 2000, configurable: true });

    elementoImagen.dispatchEvent(new Event('load'));
    await fixture.whenStable();

    expect(component.esImagen).toBe(true);
    expect(elementoImagen.classList.contains('imagen--zoom')).toBe(true);
    expect(component.porcentajeZoom).toBeLessThan(50);

    component.tamanoOriginal();
    expect(component.porcentajeZoom).toBe(100);

    component.acercar();
    expect(component.porcentajeZoom).toBeGreaterThan(100);

    component.ajustarPagina();
    expect(component.porcentajeZoom).toBeLessThan(50);
  });

  it('navega entre varios archivos', async () => {
    const cargar = vi.fn(cargarPdf);
    await crear([pdf, imagen], cargar as CargarArchivoVisor);

    expect(component.puedeAnterior).toBe(false);
    component.siguiente();
    await fixture.whenStable();

    expect(component.indice()).toBe(1);
    expect(cargar).toHaveBeenLastCalledWith(imagen);
    expect(component.puedeSiguiente).toBe(false);
  });

  it('descarga el archivo original', async () => {
    await crear([pdf], cargarPdf);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.descargar();

    expect(clic).toHaveBeenCalled();
    clic.mockRestore();
  });

  it('abre el archivo en otra pestaña', async () => {
    await crear([pdf], cargarPdf);
    const abrir = vi.fn(() => null);
    Object.defineProperty(window, 'open', { value: abrir, configurable: true });

    component.abrir();

    expect(abrir).toHaveBeenCalledWith('blob:archivo', '_blank', 'noopener');
  });

  it('cierra el visor', async () => {
    await crear([pdf], cargarPdf);

    component.cerrar();

    expect(modalService.close).toHaveBeenCalled();
  });

  it('elimina únicamente el archivo actual y avisa al módulo de origen', async () => {
    const eliminar = vi.fn(() => of(void 0));
    await crear([pdf, imagen], cargarPdf, eliminar);

    await component.eliminar();

    expect(eliminar).toHaveBeenCalledWith(pdf);
    expect(component.archivos.map((archivo) => archivo.id)).toEqual([2]);
    expect(component.indice()).toBe(0);
  });

  it('muestra una vista previa no disponible para Word', async () => {
    await crear([word], cargarWord);

    expect(component.tipo()).toBe('word');
    expect(fixture.nativeElement.querySelector('.sin-vista')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Vista previa no disponible');
  });

  it('muestra el error de carga y permite reintentar', async () => {
    const cargar = vi.fn(() => throwError(() => new TimeoutError()));
    await crear([pdf], cargar as CargarArchivoVisor);

    expect(fixture.nativeElement.textContent).toContain(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
    expect(fixture.nativeElement.querySelector('.btn-reintentar')).not.toBeNull();
  });
});
