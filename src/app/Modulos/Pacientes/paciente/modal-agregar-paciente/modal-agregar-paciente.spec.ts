import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAgregarPaciente } from './modal-agregar-paciente';

describe('ModalAgregarPaciente', () => {
  let component: ModalAgregarPaciente;
  let fixture: ComponentFixture<ModalAgregarPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAgregarPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalAgregarPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
