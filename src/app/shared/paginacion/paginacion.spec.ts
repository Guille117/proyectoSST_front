import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Paginacion } from './paginacion';

describe('Paginacion', () => {
  let component: Paginacion;
  let fixture: ComponentFixture<Paginacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paginacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Paginacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cuenta solo las filas de la pagina actual', () => {
    component.cantidadMostrar = 5;
    component.totalregistros = 11;
    expect(component.mostrando).toBe(5);
    expect(component.totalPaginas).toBe(3);
    component.paginaActual = 3;
    expect(component.mostrando).toBe(1);
    component.totalregistros = 0;
    component.paginaActual = 1;
    expect(component.mostrando).toBe(0);
    expect(component.totalPaginas).toBe(1);
  });
});
