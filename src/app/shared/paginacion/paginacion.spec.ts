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

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

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

  it('compone el recuento de registros con el total del listado', () => {
    component.cantidadMostrar = 5;
    component.totalregistros = 11;
    component.paginaActual = 3;

    expect(component.textoMostrando).toBe('Mostrando 1 de 11 resultados');
  });

  it('intercala el texto alterno con el recuento cuando la pantalla lo precisa', () => {
    // Los valores se comunican como en la pantalla real para que el recuento quede estable
    fixture.componentRef.setInput('cantidadMostrar', 5);
    fixture.componentRef.setInput('totalregistros', 2);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.texto').textContent).toContain('Mostrando 2 de 2 resultados');
    expect(elemento('.texto-alterno--intercalado')).toBeNull();

    fixture.componentRef.setInput('textoAlterno', 'Seleccione un medicamento');
    fixture.detectChanges();

    const alterno = elemento<HTMLElement>('.texto-alterno--intercalado');

    expect(alterno.textContent?.trim()).toBe('Seleccione un medicamento');
    expect(elemento<HTMLElement>('.texto').textContent).toContain('Mostrando 2 de 2 resultados');
  });

  it('permite mostrar primero el texto alterno', () => {
    fixture.componentRef.setInput('cantidadMostrar', 5);
    fixture.componentRef.setInput('totalregistros', 2);
    fixture.componentRef.setInput('textoAlterno', 'Seleccione un medicamento');
    fixture.componentRef.setInput('alternoPrimero', true);
    fixture.detectChanges();

    const textos: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.texto-alterno');
    const contenedor: HTMLElement = elemento('.texto');

    expect(contenedor.classList.contains('texto--alterno-primero')).toBe(true);
    expect(textos[0].textContent?.trim()).toBe('Seleccione un medicamento');
    expect(textos[0].classList.contains('texto-alterno--intercalado')).toBe(true);
  });
});
