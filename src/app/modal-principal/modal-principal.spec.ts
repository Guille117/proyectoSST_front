import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { VisorArchivos } from '../shared/visor-archivos/visor-archivos';
import { ModalPrincipal } from './modal-principal';
import { ModalService } from './modal-service';

describe('ModalPrincipal', () => {
  let component: ModalPrincipal;
  let fixture: ComponentFixture<ModalPrincipal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPrincipal],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalPrincipal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('aplica la clase del visor de archivos a pantalla completa', async () => {
    const modalService = TestBed.inject(ModalService);

    modalService.datosInput.set({
      title: 'Archivos de Hemograma',
      modalClass: 'modal-visor-documentos',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialogo.classList.contains('modal-visor-documentos')).toBe(true);

    modalService.datosInput.set(null);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renderiza el visor de archivos dentro del modal a pantalla completa', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:archivo'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    const modalService = TestBed.inject(ModalService);
    modalService.datosInput.set({
      title: 'Archivo',
      modalClass: 'modal-visor-documentos',
      archivos: [{ id: 1, nombreOriginal: 'informe.pdf' }],
      cargarArchivo: () => of(new Blob(['%PDF-1.7'], { type: 'application/pdf' })),
    });
    modalService.componenteActivo.set(VisorArchivos);

    await fixture.whenStable();
    fixture.detectChanges();

    const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialogo.classList.contains('modal-visor-documentos')).toBe(true);
    expect(fixture.nativeElement.querySelector('app-visor-archivos')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.barra')).toBeTruthy();

    modalService.datosInput.set(null);
    modalService.componenteActivo.set(null);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render the title provided by the modal service', async () => {
    const modalService = TestBed.inject(ModalService);

    modalService.datosInput.set({ title: 'Agregar paciente' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Agregar paciente');

    modalService.datosInput.set(null);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('');
  });
});
