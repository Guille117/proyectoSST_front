import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalMasCompra } from './modal-mas-compra';

describe('ModalMasCompra', () => {
  let component: ModalMasCompra;
  let fixture: ComponentFixture<ModalMasCompra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalMasCompra],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalMasCompra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
