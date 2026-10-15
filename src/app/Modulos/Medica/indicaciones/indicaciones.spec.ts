import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Indicaciones } from './indicaciones';

describe('Indicaciones', () => {
  let component: Indicaciones;
  let fixture: ComponentFixture<Indicaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Indicaciones],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
