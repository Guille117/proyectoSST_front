import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { CatalogoUsuarios } from './catalogo-usuarios';
import { CatalogoService } from '../data/serviceCatalogo';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ConteoCatalogosUsuarios, Inter_base } from '../data/nombreInterfaz';

describe('CatalogoUsuarios', () => {
  let component: CatalogoUsuarios;
  let fixture: ComponentFixture<CatalogoUsuarios>;
  const servicio = {
    listar: vi.fn(), crear: vi.fn(), actualizar1: vi.fn(), cambiarEstado: vi.fn(),
    obtenerConteoCatalogosUsuarios: vi.fn(),
  };
  const popUps = {
    confirmarToast: vi.fn(), exito: vi.fn(), error: vi.fn(), errorDesdeBackend: vi.fn(),
  };

  function registros(cantidad: number): Inter_base[] {
    return Array.from({ length: cantidad }, (_, indice) => ({ id: indice + 1, nombre: `Puesto ${indice + 1}` }));
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
    servicio.obtenerConteoCatalogosUsuarios.mockReturnValue(of({ puestos: 3, especialidades: 4 }));
    popUps.confirmarToast.mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [CatalogoUsuarios],
      providers: [
        { provide: CatalogoService, useValue: servicio },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoUsuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(servicio.listar).toHaveBeenCalledExactlyOnceWith('puestos', true);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Puesto 1');
    expect(component.listaCatalogos.map(catalogo => catalogo.cantidad)).toEqual([3, 4]);
  });

  it.each([['Puesto', 'puestos'], ['Especialidad médica', 'especialidades']])
    ('guarda unicamente el nombre para %s', (titulo, url) => {
      component.seleccionarCatalogo(titulo, url);
      component.variableEntrada = { id: 99, nombre: 'Registro' };
      expect(component.selecciontipoDato()).toEqual({ nombre: 'Registro' });
      component.guardar(formulario());
      expect(servicio.crear).toHaveBeenCalledExactlyOnceWith(url, { nombre: 'Registro' });
      expect(component.variableEntrada.nombre).toBe('');
    });

  it.each([['Puesto', 'puestos'], ['Especialidad médica', 'especialidades']])
    ('precarga el formulario y actualiza desde el campo visible para %s', async (titulo, url) => {
      component.seleccionarCatalogo(titulo, url);
      fixture.nativeElement.querySelector('.iconEditar').click();
      await fixture.whenStable();
      const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreRegistro');
      expect(nombre.value).toBe('Puesto 1');
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
    servicio.listar.mockReturnValue(of(registros(10)));
    await component.activarDesactivar(new Event('change'), 11);
    expect(component.paginaActual).toBe(2);
    expect(servicio.listar).toHaveBeenLastCalledWith('puestos', true);
  });

  it.each([true, false])('mantiene el switch de la siguiente fila y bloquea duplicados con filtro %s', async (estado) => {
    servicio.listar.mockReturnValue(of(registros(2)));
    component.traerRegistros(estado);
    const escritura = new Subject<null>();
    const listado = new Subject<Inter_base[]>();
    servicio.cambiarEstado.mockReturnValue(escritura);
    servicio.listar.mockReturnValue(listado);
    const ejecutar = vi.spyOn(component, 'activarDesactivar');
    const switches: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.interruptor-estado input');
    const segundo = switches[1];
    switches[0].click();
    await ejecutar.mock.results[0].value;
    await fixture.whenStable();
    expect(segundo.disabled).toBe(true);
    switches[1].click();
    await component.activarDesactivar(new Event('change'), 2);
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('puestos', 1);
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(segundo.disabled).toBe(true);
    listado.next([registros(2)[1]]);
    listado.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.interruptor-estado input')).toBe(segundo);
    expect(segundo.checked).toBe(estado);
    expect(segundo.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.iconEditar') !== null).toBe(estado);
  });

  it.each(['editar', 'estado'])('cancela la confirmacion de %s al cambiar catalogo', async (operacion) => {
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    component.precargar('Puesto', 1);
    const pendiente = operacion === 'editar' ? component.editarRegistro(formulario())
      : component.activarDesactivar(new Event('change'), 1);
    component.seleccionarCatalogo('Especialidad médica', 'especialidades');
    confirmar(true);
    await pendiente;
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(component.editar).toBe(false);
    expect(component.guardando).toBe(false);
    expect(component.cambiandoEstado).toBe(false);
  });

  it.each(['editar', 'estado'])('libera el bloqueo al cancelar %s', async (operacion) => {
    popUps.confirmarToast.mockResolvedValue(false);
    component.precargar('Puesto', 1);
    if (operacion === 'editar') await component.editarRegistro(formulario());
    else await component.activarDesactivar(new Event('change'), 1);
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
    expect(component.cambiandoEstado).toBe(false);
  });

  it.each(['guardar', 'editar'])('bloquea duplicados de %s y permite reintentar tras error', async (operacion) => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    component.precargar('Puesto', 1);
    if (operacion === 'guardar') component.guardar(formulario());
    else await component.editarRegistro(formulario());
    component.guardar(formulario());
    await component.editarRegistro(formulario());
    expect(servicio.crear).toHaveBeenCalledTimes(operacion === 'guardar' ? 1 : 0);
    expect(servicio.actualizar1).toHaveBeenCalledTimes(operacion === 'editar' ? 1 : 0);
    const error = new Error('Registro duplicado');
    escritura.error(error);
    await fixture.whenStable();
    expect(component.guardando).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error,
      operacion === 'guardar' ? 'Error al guardar el registro' : 'Error al actualizar el registro');
  });

  it.each(['guardar', 'editar', 'estado'])('no altera el nuevo formulario al responder una operacion anterior: %s', async (operacion) => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    servicio.cambiarEstado.mockReturnValue(escritura);
    component.precargar('Puesto', 1);
    if (operacion === 'guardar') component.guardar(formulario());
    else if (operacion === 'editar') await component.editarRegistro(formulario());
    else await component.activarDesactivar(new Event('change'), 1);
    component.seleccionarCatalogo('Especialidad médica', 'especialidades');
    component.precargar('Especialidad nueva', 2);
    servicio.listar.mockClear();
    servicio.obtenerConteoCatalogosUsuarios.mockClear();
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.variableEntrada.nombre).toBe('Especialidad nueva');
    expect(component.editar).toBe(true);
    expect(servicio.listar).not.toHaveBeenCalled();
    expect(servicio.obtenerConteoCatalogosUsuarios).not.toHaveBeenCalled();
  });

  it('descarta consultas antiguas de lista y conteos y cancela las pendientes al salir', () => {
    const anterior = new Subject<Inter_base[]>();
    const actual = new Subject<Inter_base[]>();
    const conteoAnterior = new Subject<ConteoCatalogosUsuarios>();
    const conteoActual = new Subject<ConteoCatalogosUsuarios>();
    servicio.listar.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    servicio.obtenerConteoCatalogosUsuarios.mockReturnValueOnce(conteoAnterior).mockReturnValueOnce(conteoActual);
    component.traerRegistros(true);
    component.traerRegistros(false);
    component.obtenerConteoCatalogos();
    component.obtenerConteoCatalogos();
    actual.next(registros(2));
    anterior.next(registros(1));
    conteoActual.next({ puestos: 12, especialidades: 8 });
    conteoAnterior.next({ puestos: 1, especialidades: 1 });
    expect(component.datos.length).toBe(2);
    expect(component.listaCatalogos.map(catalogo => catalogo.cantidad)).toEqual([12, 8]);
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
