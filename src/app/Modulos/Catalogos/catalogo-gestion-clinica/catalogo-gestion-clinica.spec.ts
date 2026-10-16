import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { CatalogoGestionClinica } from './catalogo-gestion-clinica';
import { CatalogoService } from '../data/serviceCatalogo';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ConteoCatalogosClinica, Inter_base } from '../data/nombreInterfaz';

describe('CatalogoGestionClinica', () => {
  let component: CatalogoGestionClinica;
  let fixture: ComponentFixture<CatalogoGestionClinica>;
  const servicio = {
    listar: vi.fn(), crear: vi.fn(), actualizar1: vi.fn(), cambiarEstado: vi.fn(),
    obtenerConteoCatalogosClinica: vi.fn(),
  };
  const popUps = {
    confirmarToast: vi.fn(), exito: vi.fn(), error: vi.fn(), errorDesdeBackend: vi.fn(),
  };

  function registros(cantidad: number): Inter_base[] {
    return Array.from({ length: cantidad }, (_, indice) => ({ id: indice + 1, nombre: `Parte del cuerpo ${indice + 1}` }));
  }

  function formulario(): NgForm {
    return fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.listar.mockReturnValue(of(registros(1)));
    servicio.crear.mockReturnValue(of(null));
    servicio.actualizar1.mockReturnValue(of(null));
    servicio.cambiarEstado.mockReturnValue(of(null));
    servicio.obtenerConteoCatalogosClinica.mockReturnValue(of({ partesCuerpo: 3, condicionesEgreso: 4 }));
    popUps.confirmarToast.mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [CatalogoGestionClinica],
      providers: [
        { provide: CatalogoService, useValue: servicio },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoGestionClinica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(servicio.listar).toHaveBeenCalledExactlyOnceWith('partesCuerpo', true);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Parte del cuerpo 1');
    expect(component.listaCatalogos.map(catalogo => catalogo.cantidad)).toEqual([3, 4]);
  });

  it.each([['Parte del cuerpo', 'partesCuerpo'], ['Condición de egreso', 'condicionesEgreso']])
    ('guarda unicamente el nombre para %s', (titulo, url) => {
      component.seleccionarCatalogo(titulo, url);
      component.variableEntrada = { id: 99, nombre: 'Registro' };
      expect(component.selecciontipoDato()).toEqual({ nombre: 'Registro' });
      component.guardar(formulario());
      expect(servicio.crear).toHaveBeenCalledExactlyOnceWith(url, { nombre: 'Registro' });
      expect(component.variableEntrada.nombre).toBe('');
    });

  it.each([['Parte del cuerpo', 'partesCuerpo'], ['Condición de egreso', 'condicionesEgreso']])
    ('precarga el formulario y actualiza desde el campo visible para %s', async (titulo, url) => {
      component.seleccionarCatalogo(titulo, url);
      fixture.nativeElement.querySelector('.iconEditar').click();
      await fixture.whenStable();
      const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreRegistro');
      expect(nombre.value).toBe('Parte del cuerpo 1');
      expect(component.hayCambios()).toBe(false);
      nombre.value = 'Nuevo nombre';
      nombre.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(component.hayCambios()).toBe(true);
      await component.editarRegistro(formulario());
      expect(servicio.actualizar1).toHaveBeenCalledExactlyOnceWith(url, 1, { nombre: 'Nuevo nombre' });
      expect(component.editar).toBe(false);
    });

  it('pagina de cinco en cinco y ajusta la ultima pagina al quitar una fila', async () => {
    servicio.listar.mockReturnValue(of(registros(11)));
    component.traerRegistros(true);
    const siguiente: HTMLButtonElement = fixture.nativeElement.querySelector('app-paginacion .derecha');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    siguiente.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('6');
    siguiente.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('11');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(siguiente.disabled).toBe(true);
  });

  it('libera el bloqueo al cancelar la confirmacion de edicion', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    component.precargar('Parte del cuerpo 1', 1);
    await component.editarRegistro(formulario());
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
  });

  it('bloquea duplicados al guardar y permite reintentar tras error', async () => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    component.variableEntrada.nombre = 'Abdomen';
    component.guardar(formulario());
    component.guardar(formulario());
    expect(servicio.crear).toHaveBeenCalledTimes(1);
    const error = new Error('Registro duplicado');
    escritura.error(error);
    await fixture.whenStable();
    expect(component.guardando).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'Error al guardar el registro');
  });

  it('descarta consultas antiguas de lista y conteos y cancela las pendientes al salir', () => {
    const anterior = new Subject<Inter_base[]>();
    const actual = new Subject<Inter_base[]>();
    const conteoAnterior = new Subject<ConteoCatalogosClinica>();
    const conteoActual = new Subject<ConteoCatalogosClinica>();
    servicio.listar.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    servicio.obtenerConteoCatalogosClinica.mockReturnValueOnce(conteoAnterior).mockReturnValueOnce(conteoActual);
    component.traerRegistros(true);
    component.traerRegistros(false);
    component.obtenerConteoCatalogos();
    component.obtenerConteoCatalogos();
    actual.next(registros(2));
    anterior.next(registros(1));
    conteoActual.next({ partesCuerpo: 12, condicionesEgreso: 20 });
    conteoAnterior.next({ partesCuerpo: 1, condicionesEgreso: 2 });
    expect(component.datos.length).toBe(2);
    expect(component.listaCatalogos.map(catalogo => catalogo.cantidad)).toEqual([12, 20]);
    expect(anterior.observed).toBe(false);
    expect(conteoAnterior.observed).toBe(false);
    fixture.destroy();
    expect(actual.observed).toBe(false);
    expect(conteoActual.observed).toBe(false);
  });

  it.each([true, false])('restaura el switch si falla el cambio con filtro %s', async (estado) => {
    component.traerRegistros(estado);
    const error = new Error('Cambio rechazado');
    servicio.cambiarEstado.mockReturnValue(throwError(() => error));
    const ejecutar = vi.spyOn(component, 'activarDesactivar');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    checkbox.click();
    await ejecutar.mock.results[0].value;
    await fixture.whenStable();
    expect(checkbox.checked).toBe(estado);
    expect(checkbox.disabled).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'Error al cambiar el estado del registro');
  });

  it('limpia datos antiguos si falla la recarga y permite reintentar', async () => {
    const error = new Error('Error de recarga');
    servicio.listar.mockReturnValue(throwError(() => error));
    component.traerRegistros(false);
    await fixture.whenStable();
    expect(component.datos).toEqual([]);
    expect(component.paginaActual).toBe(1);
    expect(component.cargandoRegistros).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'No se pudo actualizar la lista. Intente recargarla.');
    servicio.listar.mockReturnValue(of(registros(1)));
    component.traerRegistros(false);
    expect(component.datos.length).toBe(1);
  });
});

