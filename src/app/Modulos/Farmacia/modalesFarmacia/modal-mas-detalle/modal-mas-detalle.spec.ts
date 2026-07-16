import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalMasDetalle } from './modal-mas-detalle';

describe('ModalMasDetalle', () => {
  let component: ModalMasDetalle;
  let fixture: ComponentFixture<ModalMasDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalMasDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalMasDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
