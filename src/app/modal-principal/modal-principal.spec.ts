import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPrincipal } from './modal-principal';

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
});
