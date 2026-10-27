import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpcionOtroComponent, OpcionOtroValor } from './opcion-otro';

describe('OpcionOtroComponent', () => {
  let fixture: ComponentFixture<OpcionOtroComponent>;
  let component: OpcionOtroComponent;

  async function crearComponente(): Promise<void> {
    await TestBed.configureTestingModule({ imports: [OpcionOtroComponent] }).compileComponents();
    fixture = TestBed.createComponent(OpcionOtroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function escribir(selector: string, valor: string, indice = 0): void {
    const entradas = fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLInputElement>;
    const entrada = entradas[indice];
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function boton(clase: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(clase) as HTMLButtonElement;
  }

  function contenedor(): HTMLElement {
    return fixture.nativeElement.querySelector('.opcion-otro') as HTMLElement;
  }

  it('no confirma cuando el nombre está vacío', async () => {
    await crearComponente();
    const emitidos: OpcionOtroValor[] = [];
    component.confirmar.subscribe((valor) => emitidos.push(valor));

    boton('.opcion-otro__check').click();

    expect(emitidos).toEqual([]);
    expect(boton('.opcion-otro__check').disabled).toBe(true);
  });

  it('confirma el nombre recortado', async () => {
    await crearComponente();
    const emitidos: OpcionOtroValor[] = [];
    component.confirmar.subscribe((valor) => emitidos.push(valor));

    escribir('.opcion-otro__entrada', '  Enfermero  ');
    boton('.opcion-otro__check').click();

    expect(emitidos).toEqual([{ nombre: 'Enfermero', abreviatura: undefined }]);
  });

  it('exige abreviatura cuando corresponde', async () => {
    await crearComponente();
    fixture.componentRef.setInput('requiereAbreviatura', true);
    fixture.detectChanges();

    const emitidos: OpcionOtroValor[] = [];
    component.confirmar.subscribe((valor) => emitidos.push(valor));

    escribir('.opcion-otro__entrada', 'Mililitro', 0);
    expect(boton('.opcion-otro__check').disabled).toBe(true);

    escribir('.opcion-otro__entrada', 'ml', 1);
    expect(boton('.opcion-otro__check').disabled).toBe(false);

    boton('.opcion-otro__check').click();
    expect(emitidos).toEqual([{ nombre: 'Mililitro', abreviatura: 'ml' }]);
  });

  it('emite cancelar con el botón X', async () => {
    await crearComponente();
    let cancelado = false;
    component.cancelar.subscribe(() => (cancelado = true));

    boton('.opcion-otro__cancelar').click();

    expect(cancelado).toBe(true);
  });

  it('bloquea las acciones mientras crea', async () => {
    await crearComponente();
    fixture.componentRef.setInput('creando', true);
    fixture.detectChanges();

    expect(boton('.opcion-otro__check').disabled).toBe(true);
    expect(boton('.opcion-otro__cancelar').disabled).toBe(true);

    const entrada = fixture.nativeElement.querySelector('.opcion-otro__entrada') as HTMLInputElement;
    expect(entrada.readOnly).toBe(true);
  });

  it('marca el borde verde solo cuando está completo', async () => {
    await crearComponente();
    expect(contenedor().classList.contains('con-datos')).toBe(false);

    escribir('.opcion-otro__entrada', 'Camillero');

    expect(contenedor().classList.contains('con-datos')).toBe(true);
  });
});
