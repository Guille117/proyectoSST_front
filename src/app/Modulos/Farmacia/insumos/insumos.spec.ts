import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Insumos } from './insumos';

describe('Insumos', () => {
  let component: Insumos;
  let fixture: ComponentFixture<Insumos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Insumos] }).compileComponents();
    fixture = TestBed.createComponent(Insumos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('crea la vista de insumos con la distribucion de tabla y formulario', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Agregar insumo');
    expect(fixture.nativeElement.querySelector('.trabajoArea > .table-container')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.trabajoArea > .formulario-container')).not.toBeNull();
  });

  it('ofrece solo nombre y fabricante como criterios de busqueda', () => {
    const selector: HTMLSelectElement = fixture.nativeElement.querySelector('.buscador .selector');
    expect(Array.from(selector.options, (opcion) => opcion.textContent)).toEqual(['Nombre', 'Fabricante']);
    expect(fixture.nativeElement.querySelector('.buscador input[type="search"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btnLupa .bi-search')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tab-switch').textContent).toContain('Activos');
    expect(fixture.nativeElement.querySelector('app-tab-switch').textContent).toContain('Inactivos');
  });

  it('muestra las cuatro columnas sin registros inventados', () => {
    const columnas: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('thead th');
    expect(Array.from(columnas, (columna) => columna.textContent)).toEqual([
      'No.', 'Nombre', 'Fabricante', 'Acciones',
    ]);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('incluye solo nombre y fabricante en el formulario sin conectar operaciones', () => {
    const campos: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('form input, form select');
    expect(Array.from(campos, (campo) => campo.getAttribute('name'))).toEqual(['nombre', 'fabricante']);
    const fabricante: HTMLSelectElement = fixture.nativeElement.querySelector('#fabricanteInsumo');
    expect(fabricante.options.length).toBe(1);
    const botones: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.botones button');
    expect(Array.from(botones, (boton) => boton.textContent)).toEqual(['Cancelar', 'Guardar']);
    expect(Array.from(botones).every((boton) => boton.type === 'button')).toBe(true);
  });
});