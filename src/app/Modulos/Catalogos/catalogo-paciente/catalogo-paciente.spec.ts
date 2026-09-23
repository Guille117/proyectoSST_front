import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoPaciente } from './catalogo-paciente';

describe('CatalogoPaciente', () => {
  let component: CatalogoPaciente;
  let fixture: ComponentFixture<CatalogoPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
