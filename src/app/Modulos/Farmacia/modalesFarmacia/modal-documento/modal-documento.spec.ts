import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModalPrincipal } from '../../../../modal-principal/modal-principal';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ServicioCompra } from '../../ingresos/agregar-compra/data/servicio-compra';
import { ModalDocumento } from './modal-documento';

describe('ModalDocumento', () => {
  let fixture: ComponentFixture<ModalDocumento>;

  const servicioCompra = {
    obtenerComprobante: vi.fn(() => of(new Blob())),
  };

  beforeEach(async () => {
    servicioCompra.obtenerComprobante.mockReset();
    servicioCompra.obtenerComprobante.mockReturnValue(of(new Blob()));

    await TestBed.configureTestingModule({
      imports: [ModalDocumento],
      providers: [{ provide: ServicioCompra, useValue: servicioCompra }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocumento);
  });

  it('muestra un mensaje cuando no hay documento', () => {
    fixture.componentRef.setInput('documento', '');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay un documento');
  });

  it('muestra una URL externa sin descargarla con el cliente HTTP', () => {
    fixture.componentRef.setInput('documento', 'https://example.com/documento.pdf');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('iframe')).toBeTruthy();
    expect(servicioCompra.obtenerComprobante).not.toHaveBeenCalled();
  });

  it('muestra una imagen externa con la etiqueta img', () => {
    fixture.componentRef.setInput('documento', 'https://example.com/documento.png');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('incluye acciones para imprimir y descargar', () => {
    fixture.componentRef.setInput('documento', 'https://example.com/documento.png');
    fixture.detectChanges();

    const etiquetas = fixture.componentInstance.modalActions.map((accion) => accion.label);
    expect(etiquetas).toContain('Imprimir');
    expect(etiquetas).toContain('Descargar');
  });

  it('descarga el documento mediante un enlace temporal', () => {
    fixture.componentRef.setInput('documento', 'https://example.com/documento.png');
    fixture.detectChanges();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fixture.componentInstance.descargar();

    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('imprime el documento mediante un iframe temporal', () => {
    fixture.componentRef.setInput('documento', 'https://example.com/documento.png');
    fixture.detectChanges();
    const append = vi.spyOn(document.body, 'appendChild');

    fixture.componentInstance.imprimir();

    expect(append).toHaveBeenCalled();
    const frame = append.mock.calls[0][0] as HTMLIFrameElement;
    expect(frame.tagName).toBe('IFRAME');
    frame.remove();
    append.mockRestore();
  });
});

describe('ModalDocumento en ModalPrincipal', () => {
  it('renderiza el documento al abrir el modal', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'showModal',
    );
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });

    try {
      await TestBed.configureTestingModule({
        imports: [ModalPrincipal],
        providers: [
          {
            provide: ServicioCompra,
            useValue: { obtenerComprobante: vi.fn(() => of(new Blob())) },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(ModalPrincipal);
      fixture.detectChanges();

      const modalService = TestBed.inject(ModalService);
      modalService.open(ModalDocumento, {
        title: 'Documento',
        documento: 'https://example.com/documento.pdf',
        nombreArchivo: 'documento',
      });

      fixture.detectChanges();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-modal-documento')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-modal-documento iframe')).toBeTruthy();

      const footer: HTMLElement = fixture.nativeElement.querySelector('.modal-footer');
      const acciones = Array.from(
        footer.querySelectorAll<HTMLButtonElement>('button'),
      ).map((boton) => boton.textContent?.trim());
      expect(acciones).toEqual(
        expect.arrayContaining(['Imprimir', 'Descargar', 'Cerrar']),
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', descriptor);
      } else {
        delete (HTMLDialogElement.prototype as { showModal?: unknown }).showModal;
      }
    }
  });
});
