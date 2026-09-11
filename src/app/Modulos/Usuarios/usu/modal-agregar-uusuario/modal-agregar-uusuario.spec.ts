import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAgregarUusuario } from './modal-agregar-uusuario';

describe('ModalAgregarUusuario', () => {
  let component: ModalAgregarUusuario;
  let fixture: ComponentFixture<ModalAgregarUusuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAgregarUusuario],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalAgregarUusuario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
