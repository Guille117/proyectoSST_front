import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { CatalogoFarmacia } from './catalogo-farmacia';
import { CatalogoService } from '../data/serviceCatalogo';
import { Inter_unidadMedida, registrosCatalogos } from '../data/nombreInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('CatalogoFarmacia', () => {
  let component: CatalogoFarmacia;
  let fixture: ComponentFixture<CatalogoFarmacia>;
  const servicio = {
    listar: vi.fn(),
    cambiarEstado: vi.fn(),
    actualizar1: vi.fn(),
    crear: vi.fn(),
    obtenerRegistrosCatalogosFarmacia: vi.fn(),
  };
  const popUps = {
    confirmarToast: vi.fn(),
    exito: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.listar.mockReturnValue(of([{ id: 6, nombre: 'Metro', abreviatura: 'm' }]));
    servicio.cambiarEstado.mockReturnValue(of(null));
    servicio.actualizar1.mockReturnValue(of(null));
    servicio.crear.mockReturnValue(of(null));
    servicio.obtenerRegistrosCatalogosFarmacia.mockReturnValue(of([]));
    popUps.confirmarToast.mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [CatalogoFarmacia],
      providers: [
        { provide: CatalogoService, useValue: servicio },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoFarmacia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([
    { operacion: 'guardar', falla: false },
    { operacion: 'guardar', falla: true },
    { operacion: 'editar', falla: false },
    { operacion: 'editar', falla: true },
  ])('bloquea envios repetidos en $operacion y se libera al terminar (falla: $falla)', async ({ operacion, falla }) => {
    if (operacion === 'editar') {
      fixture.nativeElement.querySelector('.iconEditar').click();
      await fixture.whenStable();
    }
    for (const selector of ['#nombreRegistro', '#abreviaturaRegistro']) {
      const campo: HTMLInputElement = fixture.nativeElement.querySelector(selector);
      campo.value = 'Nuevo';
      campo.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));

    const pendiente = operacion === 'editar'
      ? component.editarRegistro(formulario)
      : Promise.resolve(component.guardar(formulario));
    await fixture.whenStable();
    expect(component.guardando).toBe(true);
    expect(fixture.nativeElement.querySelector('.acciones-formulario ._guardar').disabled).toBe(true);
    component.guardar(formulario);
    await component.editarRegistro(formulario);
    if (operacion === 'editar') confirmar(true);
    await pendiente;
    expect(servicio.crear).toHaveBeenCalledTimes(operacion === 'guardar' ? 1 : 0);
    expect(servicio.actualizar1).toHaveBeenCalledTimes(operacion === 'editar' ? 1 : 0);
    expect(popUps.confirmarToast).toHaveBeenCalledTimes(operacion === 'editar' ? 1 : 0);

    if (falla) escritura.error(new Error('Error al guardar'));
    else {
      escritura.next(null);
      escritura.complete();
    }
    await fixture.whenStable();
    expect(component.guardando).toBe(false);
    if (falla) expect(fixture.nativeElement.querySelector('.acciones-formulario ._guardar').disabled).toBe(false);
  });

  it('libera guardar si falla la confirmacion de edicion', async () => {
    component.precargar('Metro', 6, 'm');
    popUps.confirmarToast.mockRejectedValue(new Error('Confirmacion interrumpida'));
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    await component.editarRegistro(formulario);
    expect(component.guardando).toBe(false);
    expect(servicio.actualizar1).not.toHaveBeenCalled();
  });

  it.each([
    ['guardar', 'Error al guardar el registro'],
    ['editar', 'Error al actualizar el registro'],
    ['estado', 'Error al cambiar el estado del registro'],
  ])('muestra el mensaje del backend al fallar %s', async (operacion, respaldo) => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'El registro ya existe' } });
    servicio.crear.mockReturnValue(throwError(() => error));
    servicio.actualizar1.mockReturnValue(throwError(() => error));
    servicio.cambiarEstado.mockReturnValue(throwError(() => error));
    const avisos = new PopUps();
    const mostrar = vi.spyOn(avisos, 'error').mockImplementation(() => {});
    popUps.errorDesdeBackend.mockImplementation((recibido: unknown, mensaje: string) =>
      avisos.errorDesdeBackend(recibido, mensaje));
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    if (operacion === 'guardar') {
      component.guardar(formulario);
    } else if (operacion === 'editar') {
      component.precargar('Metro', 6, 'm');
      await component.editarRegistro(formulario);
    } else {
      await component.activarDesactivar(new Event('change'), 6);
    }
    expect(popUps.errorDesdeBackend).toHaveBeenCalledExactlyOnceWith(error, respaldo);
    expect(mostrar).toHaveBeenCalledExactlyOnceWith('El registro ya existe');
    expect(popUps.exito).not.toHaveBeenCalled();
  });

  it.each([true, false])('quita filas desactualizadas y permite reintentar si falla la lista con filtro %s', async (estado) => {
    const error = new Error('Servidor no disponible');
    component.paginaActual = 2;
    servicio.listar.mockReturnValue(throwError(() => error));
    component.traerRegistros(estado);
    await fixture.whenStable();
    expect(component.datos).toEqual([]);
    expect(component.paginaActual).toBe(1);
    expect(component.cargandoRegistros).toBe(false);
    expect(component.mostrarActivos).toBe(estado);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-paginacion .texto').textContent)
      .toContain('Mostrando 0 de 0 resultados');
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'No se pudo actualizar la lista. Intente recargarla.');

    servicio.listar.mockReturnValue(of([{ id: 9, nombre: 'Recuperado', abreviatura: 'r' }]));
    component.seleccionarCatalogo('Unidad de medida', 'unidadMedida');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Recuperado');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(estado);
  });

  it.each([true, false])('no mantiene el registro anterior si el cambio de estado funciona pero falla la recarga: %s', async (estado) => {
    component.traerRegistros(estado);
    const listado = new Subject<Inter_unidadMedida[]>();
    servicio.listar.mockReturnValue(listado);
    await component.activarDesactivar(new Event('change'), 6);
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6);
    const error = new Error('Error de recarga');
    listado.error(error);
    await fixture.whenStable();
    expect(component.cambiandoEstado).toBe(false);
    expect(component.cargandoRegistros).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.interruptor-estado input').length).toBe(0);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledExactlyOnceWith(error, 'No se pudo actualizar la lista. Intente recargarla.');
    expect(servicio.cambiarEstado).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('bloquea pulsaciones durante confirmacion, peticion y recarga con filtro %s', async (estado) => {
    const primero = { id: 6, nombre: 'Metro', abreviatura: 'm' };
    const segundo = { id: 7, nombre: 'Litro', abreviatura: 'l' };
    servicio.listar.mockReturnValue(of([primero, segundo]));
    component.traerRegistros(estado);
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    const escritura = new Subject<null>();
    const listado = new Subject<Inter_unidadMedida[]>();
    servicio.cambiarEstado.mockReturnValue(escritura);
    servicio.listar.mockReturnValue(listado);
    const switches: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.interruptor-estado input');
    const ejecutar = vi.spyOn(component, 'activarDesactivar');
    switches[0].click();
    const pendiente = ejecutar.mock.results[0].value;
    await fixture.whenStable();
    expect(switches[0].checked).toBe(estado);
    expect(Array.from(switches).every(checkbox => checkbox.disabled)).toBe(true);
    switches[0].click();
    switches[1].click();
    await component.activarDesactivar(new Event('change'), 7);
    expect(popUps.confirmarToast).toHaveBeenCalledOnce();

    confirmar(true);
    await pendiente;
    await fixture.whenStable();
    expect(switches[0].disabled).toBe(true);
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6);
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.cambiandoEstado).toBe(false);
    expect(component.cargandoRegistros).toBe(true);
    expect(switches[1].disabled).toBe(true);
    await component.activarDesactivar(new Event('change'), 7);
    expect(servicio.cambiarEstado).toHaveBeenCalledTimes(1);

    listado.next([segundo]);
    listado.complete();
    await fixture.whenStable();
    const restante: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    expect(restante.disabled).toBe(false);
    expect(restante.checked).toBe(estado);
  });

  it('libera el bloqueo si la confirmacion no puede completarse', async () => {
    popUps.confirmarToast.mockRejectedValue(new Error('Confirmacion interrumpida'));
    await component.activarDesactivar(new Event('change'), 6);
    await fixture.whenStable();
    expect(component.cambiandoEstado).toBe(false);
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.interruptor-estado input').disabled).toBe(false);
  });

  it('consulta solo al cambiar realmente la opcion del filtro', async () => {
    servicio.listar.mockClear();
    const opciones: NodeListOf<HTMLDivElement> = fixture.nativeElement.querySelectorAll('app-tab-switch .miniSubMenu > div');
    opciones[0].click();
    await fixture.whenStable();
    expect(servicio.listar).not.toHaveBeenCalled();
    opciones[1].click();
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(false);
    expect(servicio.listar).toHaveBeenCalledExactlyOnceWith('unidadMedida', false);
    opciones[1].click();
    await fixture.whenStable();
    expect(servicio.listar).toHaveBeenCalledTimes(1);
    opciones[0].click();
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(true);
    expect(servicio.listar).toHaveBeenLastCalledWith('unidadMedida', true);
    expect(servicio.listar).toHaveBeenCalledTimes(2);
  });

  it.each(['estado', 'editar'])('cancela la confirmacion de %s al cambiar catalogo y volver', async (operacion) => {
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    component.precargar('Metro', 6, 'm');
    const pendiente = operacion === 'editar'
      ? component.editarRegistro(formulario)
      : component.activarDesactivar(new Event('change'), 6);
    component.seleccionarCatalogo('Fabricante', 'marca');
    component.seleccionarCatalogo('Unidad de medida', 'unidadMedida');
    confirmar(true);
    await pendiente;
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(component.editar).toBe(false);
    expect(component.variableEntrada).toEqual({ nombre: '', abreviatura: '' });
  });

  it('no actualiza otro registro seleccionado durante la confirmacion', async () => {
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    component.precargar('Metro', 6, 'm');
    const pendiente = component.editarRegistro(formulario);
    component.precargar('Litro', 7, 'l');
    confirmar(true);
    await pendiente;
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(component.idRegistroSeleccionado).toBe(7);
    expect(component.editar).toBe(true);
  });

  it('envia los datos que estaban seleccionados al abrir la confirmacion', async () => {
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    component.precargar('Metro', 6, 'mm');
    const pendiente = component.editarRegistro(formulario);
    component.variableEntrada.abreviatura = 'otro';
    confirmar(true);
    await pendiente;
    expect(servicio.actualizar1).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6, { nombre: 'Metro', abreviatura: 'mm' });
  });

  it.each(['guardar', 'editar', 'estado'])('ignora la respuesta de %s si ya se cambio de catalogo', async (operacion) => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    servicio.cambiarEstado.mockReturnValue(escritura);
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    if (operacion === 'guardar') {
      component.guardar(formulario);
    } else if (operacion === 'editar') {
      component.precargar('Metro', 6, 'm');
      await component.editarRegistro(formulario);
    } else {
      await component.activarDesactivar(new Event('change'), 6);
    }
    component.seleccionarCatalogo('Fabricante', 'marca');
    component.precargar('Fabricante nuevo', 8);
    servicio.listar.mockClear();
    servicio.obtenerRegistrosCatalogosFarmacia.mockClear();
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.editar).toBe(true);
    expect(component.variableEntrada.nombre).toBe('Fabricante nuevo');
    expect(servicio.listar).not.toHaveBeenCalled();
    expect(servicio.obtenerRegistrosCatalogosFarmacia).not.toHaveBeenCalled();
  });

  it.each(['filtro', 'catalogo', 'recarga'])('descarta respuestas anteriores al cambiar %s', async (cambio) => {
    const anterior = new Subject<Inter_unidadMedida[]>();
    const actual = new Subject<Inter_unidadMedida[]>();
    servicio.listar.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    component.traerRegistros(true);
    expect(anterior.observed).toBe(true);
    if (cambio === 'catalogo') {
      component.seleccionarCatalogo('Fabricante', 'marca');
    } else {
      component.traerRegistros(cambio === 'filtro' ? false : true);
    }
    expect(anterior.observed).toBe(false);
    actual.next([{ id: 9, nombre: 'Actual', abreviatura: 'a' }]);
    anterior.next([{ id: 6, nombre: 'Anterior', abreviatura: 'm' }]);
    await fixture.whenStable();
    expect(component.datos.map(dato => dato.id)).toEqual([9]);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Actual');
    expect(fixture.nativeElement.querySelector('tbody').textContent).not.toContain('Anterior');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    expect(checkbox.checked).toBe(cambio !== 'filtro');
    actual.complete();
    anterior.complete();
  });

  it('descarta conteos antiguos que llegan despues de la ultima consulta', async () => {
    const anterior = new Subject<registrosCatalogos[]>();
    const actual = new Subject<registrosCatalogos[]>();
    servicio.obtenerRegistrosCatalogosFarmacia.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    component.obtenerContedoCatalogos();
    component.obtenerContedoCatalogos();
    expect(anterior.observed).toBe(false);
    actual.next([{ tabla: 'unidad_medidas', total: 12 }]);
    anterior.next([{ tabla: 'unidad_medidas', total: 3 }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.cantidad h4').textContent.trim()).toBe('12');
    actual.complete();
    anterior.complete();
  });

  it('cancela las consultas pendientes al salir del componente', () => {
    const listado = new Subject<Inter_unidadMedida[]>();
    const conteos = new Subject<registrosCatalogos[]>();
    servicio.listar.mockReturnValue(listado);
    servicio.obtenerRegistrosCatalogosFarmacia.mockReturnValue(conteos);
    component.traerRegistros(true);
    component.obtenerContedoCatalogos();
    expect(listado.observed).toBe(true);
    expect(conteos.observed).toBe(true);
    fixture.destroy();
    expect(listado.observed).toBe(false);
    expect(conteos.observed).toBe(false);
  });

  it.each(['guardar', 'editar'])('pinta el formulario limpio despues de %s sin esperar las recargas', async (operacion) => {
    const escritura = new Subject<null>();
    const listado = new Subject<Inter_unidadMedida[]>();
    const conteos = new Subject<registrosCatalogos[]>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    servicio.listar.mockReturnValue(listado);
    servicio.obtenerRegistrosCatalogosFarmacia.mockReturnValue(conteos);
    if (operacion === 'editar') {
      fixture.nativeElement.querySelector('.iconEditar').click();
      await fixture.whenStable();
    }
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreRegistro');
    nombre.value = 'Nuevo nombre';
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    if (operacion === 'guardar') {
      component.guardar(formulario);
    } else {
      await component.editarRegistro(formulario);
    }

    expect(nombre.value).toBe('Nuevo nombre');
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.editar).toBe(false);
    expect(nombre.value).toBe('');
    expect(fixture.nativeElement.querySelector('.acciones-formulario').textContent)
      .not.toContain('Guardar Cambios');

    listado.next([{ id: 9, nombre: 'Actualizado', abreviatura: 'a' }]);
    listado.complete();
    conteos.next([{ tabla: 'unidad_medidas', total: 12 }]);
    conteos.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Actualizado');
    expect(fixture.nativeElement.querySelector('.cantidad h4').textContent.trim()).toBe('12');
  });

  it.each([true, false])('pinta la lista al recibir la recarga demorada del switch con filtro %s', async (estado) => {
    component.traerRegistros(estado);
    const escritura = new Subject<null>();
    const listado = new Subject<Inter_unidadMedida[]>();
    servicio.cambiarEstado.mockReturnValue(escritura);
    servicio.listar.mockReturnValue(listado);
    fixture.nativeElement.querySelector('.interruptor-estado input').click();
    await fixture.whenStable();
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    listado.next([]);
    listado.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
    expect(component.mostrarActivos).toBe(estado);
  });

  it.each(['guardar', 'editar', 'estado'])('refresca registros y conteos una vez despues de %s', async (operacion) => {
    component.traerRegistros(false);
    servicio.listar.mockClear();
    servicio.obtenerRegistrosCatalogosFarmacia.mockClear();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);

    if (operacion === 'guardar') {
      component.guardar(formulario);
    } else if (operacion === 'editar') {
      component.editar = true;
      await component.editarRegistro(formulario);
    } else {
      await component.activarDesactivar(new Event('change'), 6);
    }

    expect(servicio.listar).toHaveBeenCalledExactlyOnceWith('unidadMedida', false);
    expect(servicio.obtenerRegistrosCatalogosFarmacia).toHaveBeenCalledOnce();
    expect(component.mostrarActivos).toBe(false);
  });

  it.each([
    { editar: false, confirmado: true },
    { editar: true, confirmado: false },
    { editar: true, confirmado: true },
  ])('respeta la edicion y confirmacion: $editar / $confirmado', async ({ editar, confirmado }) => {
    component.editar = editar;
    component.idRegistroSeleccionado = 6;
    popUps.confirmarToast.mockResolvedValue(confirmado);
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const limpiar = vi.spyOn(component, 'limpiarFormulario');
    await component.editarRegistro(formulario);
    expect(popUps.confirmarToast).toHaveBeenCalledTimes(editar ? 1 : 0);
    expect(servicio.actualizar1).toHaveBeenCalledTimes(editar && confirmado ? 1 : 0);
    expect(limpiar).toHaveBeenCalledTimes(editar && confirmado ? 1 : 0);
    expect(component.guardando).toBe(false);
    if (editar && confirmado) expect(component.editar).toBe(false);
  });

  it.each(['Unidad de medida', 'Fabricante', 'Vía de administración', 'Presentación'])
    ('selecciona los datos de envio para %s', (catalogo) => {
      component.catalogoSeleccionado = catalogo;
      component.variableEntrada = { nombre: 'Registro', abreviatura: 'mm' };
      expect(component.selecciontipoDato()).toEqual(catalogo === 'Unidad de medida'
        ? { nombre: 'Registro', abreviatura: 'mm' }
        : { nombre: 'Registro' });
    });

  it('muestra switches apagados al consultar inactivos y encendidos al consultar activos', () => {
    component.traerRegistros(false);
    expect(component.mostrarActivos).toBe(false);
    expect(fixture.nativeElement.querySelector('.interruptor-estado input').checked).toBe(false);
    expect(fixture.nativeElement.querySelector('.iconEditar')).toBeNull();
    expect(servicio.listar).toHaveBeenLastCalledWith('unidadMedida', false);
    component.traerRegistros(true);
    expect(fixture.nativeElement.querySelector('.interruptor-estado input').checked).toBe(true);
    expect(fixture.nativeElement.querySelector('.iconEditar')).not.toBeNull();
  });

  it.each([true, false])('cambia el estado y refresca conservando el filtro %s', async (estado) => {
    component.traerRegistros(estado);
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    servicio.listar.mockReturnValue(of([]));
    checkbox.click();
    await fixture.whenStable();
    expect(popUps.confirmarToast).toHaveBeenCalledOnce();
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6);
    expect(servicio.listar).toHaveBeenLastCalledWith('unidadMedida', estado);
    expect(component.mostrarActivos).toBe(estado);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
  });

  it.each([true, false])('restaura el switch al cancelar con filtro %s', async (estado) => {
    component.traerRegistros(estado);
    popUps.confirmarToast.mockResolvedValue(false);
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    checkbox.click();
    await fixture.whenStable();
    expect(checkbox.checked).toBe(estado);
    expect(checkbox.disabled).toBe(false);
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
  });

  it.each([true, false])('conserva el switch del siguiente registro al retirar el primero con filtro %s', async (estado) => {
    const primero = { id: 6, nombre: 'Metro', abreviatura: 'm' };
    const segundo = { id: 7, nombre: 'Litro', abreviatura: 'l' };
    servicio.listar.mockReturnValue(of([primero, segundo]));
    component.traerRegistros(estado);
    const switches: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.interruptor-estado input');
    const switchSegundo = switches[1];
    servicio.listar.mockReturnValue(of([{ ...segundo }]));
    switches[0].click();
    await fixture.whenStable();
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6);
    expect(component.datos.map(dato => dato.id)).toEqual([7]);
    const switchRestante: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    expect(switchRestante).toBe(switchSegundo);
    expect(switchRestante.checked).toBe(estado);
  });

  it.each([0, 5, 6, 11])('muestra un maximo de cinco filas con %i registros', (cantidad) => {
    servicio.listar.mockReturnValue(of(Array.from({ length: cantidad }, (_, indice) => ({
      id: indice + 1, nombre: `Unidad ${indice + 1}`, abreviatura: 'u',
    }))));
    component.traerRegistros(true);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(Math.min(5, cantidad));
    expect(fixture.nativeElement.querySelector('app-paginacion .texto').textContent)
      .toContain(`Mostrando ${Math.min(5, cantidad)} de ${cantidad} resultados`);
  });

  it('navega en paginas de cinco con numeracion continua y limites', async () => {
    servicio.listar.mockReturnValue(of(Array.from({ length: 11 }, (_, indice) => ({
      id: indice + 1, nombre: `Unidad ${indice + 1}`, abreviatura: 'u',
    }))));
    component.traerRegistros(true);
    const siguiente: HTMLButtonElement = fixture.nativeElement.querySelector('app-paginacion .derecha');
    const anterior: HTMLButtonElement = fixture.nativeElement.querySelector('app-paginacion .izquierda');
    expect(anterior.disabled).toBe(true);
    siguiente.click();
    await fixture.whenStable();
    expect(component.paginaActual).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('6');
    siguiente.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('11');
    expect(fixture.nativeElement.querySelector('app-paginacion .texto').textContent)
      .toContain('Mostrando 1 de 11 resultados');
    expect(siguiente.disabled).toBe(true);
    anterior.click();
    await fixture.whenStable();
    expect(component.paginaActual).toBe(2);
  });

  it('reinicia la pagina al cambiar catalogo o filtro y la conserva al refrescar', () => {
    servicio.listar.mockReturnValue(of(Array.from({ length: 6 }, (_, indice) => ({
      id: indice + 1, nombre: `Unidad ${indice + 1}`, abreviatura: 'u',
    }))));
    component.paginaActual = 2;
    component.traerRegistros(true);
    expect(component.paginaActual).toBe(2);
    component.seleccionarCatalogo('Fabricante', 'marca');
    expect(component.paginaActual).toBe(1);
    component.paginaActual = 2;
    component.traerRegistros(false);
    expect(component.paginaActual).toBe(1);
  });

  it('retrocede al desactivar la unica fila de la ultima pagina', async () => {
    const registros = Array.from({ length: 6 }, (_, indice) => ({
      id: indice + 1, nombre: `Unidad ${indice + 1}`, abreviatura: 'u',
    }));
    servicio.listar.mockReturnValue(of(registros));
    component.paginaActual = 2;
    component.traerRegistros(true);
    servicio.listar.mockReturnValue(of(registros.slice(0, 5)));
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    checkbox.click();
    await fixture.whenStable();
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('unidadMedida', 6);
    expect(component.paginaActual).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('restaura el switch si falla la peticion', async () => {
    const error = new Error('Error de servidor');
    servicio.cambiarEstado.mockReturnValue(throwError(() => error));
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.interruptor-estado input');
    checkbox.click();
    await fixture.whenStable();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'Error al cambiar el estado del registro');
  });
});
