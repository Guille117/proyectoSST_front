import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evolucion } from './evolucion';

describe('Evolucion', () => {
  let component: Evolucion;
  let fixture: ComponentFixture<Evolucion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evolucion],
    }).compileComponents();

    fixture = TestBed.createComponent(Evolucion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
