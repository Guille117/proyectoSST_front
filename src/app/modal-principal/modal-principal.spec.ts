import { ComponentFixture, TestBed } from '@angular/core/testing';

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
