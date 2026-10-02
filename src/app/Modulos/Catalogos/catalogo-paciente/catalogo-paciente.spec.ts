import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { CatalogoPaciente } from './catalogo-paciente';
import { CatalogoService } from '../data/serviceCatalogo';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { Inter_descripcion, registrosCatalogos } from '../data/nombreInterfaz';

describe('CatalogoPaciente', () => {
  let component: CatalogoPaciente;
  let fixture: ComponentFixture<CatalogoPaciente>;
  const servicio = {
    listar: vi.fn(), crear: vi.fn(), actualizar1: vi.fn(), cambiarEstado: vi.fn(),
    obtenerRegistrosCatalogosPacientes: vi.fn(),
  };
  const popUps = {
    confirmarToast: vi.fn(), exito: vi.fn(), error: vi.fn(), errorDesdeBackend: vi.fn(),
  };

  function registros(cantidad: number): Inter_descripcion[] {
    return Array.from({ length: cantidad }, (_, indice) => ({
      id: indice + 1, nombre: `Tipo ${indice + 1}`, descripcion: `Descripcion ${indice + 1}`,
    }));
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
    servicio.obtenerRegistrosCatalogosPacientes.mockReturnValue(of([]));
    popUps.confirmarToast.mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [CatalogoPaciente],
      providers: [
        { provide: CatalogoService, useValue: servicio },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(servicio.listar).toHaveBeenCalledExactlyOnceWith('tiposCama', true);
  });

  it.each([
    ['Tipo cama', 'tiposCama'], ['Habitación', 'habitaciones'], ['Institución', 'instituciones'],
    ['Parentesco', 'parentescos'],
  ])('envia unicamente los campos del catalogo %s', (titulo, url) => {
    component.seleccionarCatalogo(titulo, url);
    component.variableEntrada = { nombre: 'Registro', descripcion: 'Detalle', telefono: '123', direccion: 'Calle' };
    const esperado = url === 'instituciones'
      ? { nombre: 'Registro', telefono: '123', direccion: 'Calle' }
      : url === 'parentescos' ? { nombre: 'Registro' }
      : { nombre: 'Registro', descripcion: 'Detalle' };
    expect(component.selecciontipoDato()).toEqual(esperado);
    component.guardar(formulario());
    expect(servicio.crear).toHaveBeenCalledExactlyOnceWith(url, esperado);
    expect(component.variableEntrada.nombre).toBe('');
  });

  it('muestra solo nombre en Parentesco y edita sin enviar campos ocultos', async () => {
    servicio.listar.mockReturnValue(of([{ id: 4, nombre: 'Madre' }]));
    const catalogos: NodeListOf<HTMLDivElement> = fixture.nativeElement.querySelectorAll('.catalogos');
    catalogos[3].click();
    await fixture.whenStable();
    expect(servicio.listar).toHaveBeenLastCalledWith('parentescos', true);
    expect(fixture.nativeElement.querySelectorAll('form input').length).toBe(1);
    expect(fixture.nativeElement.querySelector('#descripcionRegistro')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('tbody tr td').length).toBe(3);
    expect(fixture.nativeElement.querySelector('tfoot td').getAttribute('colspan')).toBe('3');
    expect(formulario().valid).toBe(false);
    fixture.nativeElement.querySelector('.iconEditar').click();
    await fixture.whenStable();
    expect(component.hayCambios()).toBe(false);
    component.variableEntrada.descripcion = 'No enviar';
    component.variableEntrada.telefono = '123';
    component.variableEntrada.direccion = 'No enviar';
    expect(component.hayCambios()).toBe(false);
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreRegistro');
    expect(nombre.value).toBe('Madre');
    nombre.value = 'Padre';
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(component.hayCambios()).toBe(true);
    await component.editarRegistro(formulario());
    expect(servicio.actualizar1).toHaveBeenCalledExactlyOnceWith('parentescos', 4, { nombre: 'Padre' });
  });

  it('asigna el conteo de parentescos cuando el backend lo incluye', () => {
    servicio.obtenerRegistrosCatalogosPacientes.mockReturnValue(of([{ tabla: 'parentescos', total: 7 }]));
    component.obtenerContedoCatalogos();
    expect(component.listaCatalogos.find(catalogo => catalogo.url === 'parentescos')?.cantidad).toBe(7);
  });

  it.each([false, true])('precarga los campos visibles y detecta cambios (institucion: %s)', async (institucion) => {
    if (institucion) component.seleccionarCatalogo('Institución', 'instituciones');
    servicio.listar.mockReturnValue(of(institucion
      ? [{ id: 2, nombre: 'Hospital', telefono: '123', direccion: 'Calle' }]
      : [{ id: 2, nombre: 'Cama', descripcion: 'Detalle' }]));
    component.traerRegistros(true);
    fixture.nativeElement.querySelector('.iconEditar').click();
    await fixture.whenStable();
    expect(component.hayCambios()).toBe(false);
    expect(fixture.nativeElement.querySelector('#nombreRegistro').value).toBe(institucion ? 'Hospital' : 'Cama');
    const selector = institucion ? '#telefonoRegistro' : '#descripcionRegistro';
    const campo: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    campo.value = 'Modificado';
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(component.hayCambios()).toBe(true);
    await component.editarRegistro(formulario());
    expect(servicio.actualizar1).toHaveBeenCalledExactlyOnceWith(institucion ? 'instituciones' : 'tiposCama', 2,
      institucion ? { nombre: 'Hospital', telefono: 'Modificado', direccion: 'Calle' }
        : { nombre: 'Cama', descripcion: 'Modificado' });
    expect(component.editar).toBe(false);
  });

  it('pagina en grupos de cinco con numeracion continua', async () => {
    servicio.listar.mockReturnValue(of(registros(11)));
    component.traerRegistros(true);
    const siguiente: HTMLButtonElement = fixture.nativeElement.querySelector('app-paginacion .derecha');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    siguiente.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('6');
    siguiente.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody td').textContent.trim()).toBe('11');
    expect(siguiente.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('app-paginacion .texto').textContent).toContain('Mostrando 1 de 11 resultados');
    component.traerRegistros(false);
    expect(component.paginaActual).toBe(1);
  });

  it.each([true, false])('conserva el switch siguiente y bloquea duplicados con filtro %s', async (estado) => {
    servicio.listar.mockReturnValue(of(registros(2)));
    component.traerRegistros(estado);
    const escritura = new Subject<null>();
    const listado = new Subject<Inter_descripcion[]>();
    servicio.cambiarEstado.mockReturnValue(escritura);
    servicio.listar.mockReturnValue(listado);
    const ejecutar = vi.spyOn(component, 'activarDesactivar');
    const switches: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.interruptor-estado input');
    const segundo = switches[1];
    switches[0].click();
    await ejecutar.mock.results[0].value;
    await fixture.whenStable();
    expect(segundo.disabled).toBe(true);
    switches[0].click();
    await component.activarDesactivar(new Event('change'), 2);
    expect(servicio.cambiarEstado).toHaveBeenCalledExactlyOnceWith('tiposCama', 1);
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

  it.each(['editar', 'estado'])('cancela %s al cambiar de catalogo durante la confirmacion', async (operacion) => {
    let confirmar!: (valor: boolean) => void;
    popUps.confirmarToast.mockReturnValue(new Promise<boolean>(resolver => { confirmar = resolver; }));
    component.precargar('Tipo', 1, 'Detalle');
    const pendiente = operacion === 'editar' ? component.editarRegistro(formulario())
      : component.activarDesactivar(new Event('change'), 1);
    component.seleccionarCatalogo('Institución', 'instituciones');
    confirmar(true);
    await pendiente;
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(component.editar).toBe(false);
    expect(component.guardando).toBe(false);
    expect(component.cambiandoEstado).toBe(false);
  });

  it.each(['guardar', 'editar'])('bloquea envios repetidos de %s y permite reintentar tras error', async (operacion) => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    component.precargar('Tipo', 1, 'Detalle');
    if (operacion === 'guardar') component.guardar(formulario());
    else await component.editarRegistro(formulario());
    component.guardar(formulario());
    await component.editarRegistro(formulario());
    expect(servicio.crear).toHaveBeenCalledTimes(operacion === 'guardar' ? 1 : 0);
    expect(servicio.actualizar1).toHaveBeenCalledTimes(operacion === 'editar' ? 1 : 0);
    const error = new Error('Fallo del servidor');
    escritura.error(error);
    await fixture.whenStable();
    expect(component.guardando).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error,
      operacion === 'guardar' ? 'Error al guardar el registro' : 'Error al actualizar el registro');
  });

  it('descarta respuestas viejas de lista y conteos y cancela consultas al salir', () => {
    const anterior = new Subject<Inter_descripcion[]>();
    const actual = new Subject<Inter_descripcion[]>();
    const conteoAnterior = new Subject<registrosCatalogos[]>();
    const conteoActual = new Subject<registrosCatalogos[]>();
    servicio.listar.mockReturnValueOnce(anterior).mockReturnValueOnce(actual);
    servicio.obtenerRegistrosCatalogosPacientes.mockReturnValueOnce(conteoAnterior).mockReturnValueOnce(conteoActual);
    component.traerRegistros(true);
    component.traerRegistros(false);
    component.obtenerContedoCatalogos();
    component.obtenerContedoCatalogos();
    actual.next(registros(2));
    anterior.next(registros(1));
    conteoActual.next([{ tabla: 'tipos_cama', total: 12 }]);
    conteoAnterior.next([{ tabla: 'tipos_cama', total: 1 }]);
    expect(component.datos.length).toBe(2);
    expect(component.listaCatalogos[0].cantidad).toBe(12);
    expect(anterior.observed).toBe(false);
    expect(conteoAnterior.observed).toBe(false);
    fixture.destroy();
    expect(actual.observed).toBe(false);
    expect(conteoActual.observed).toBe(false);
  });

  it('limpia filas obsoletas al fallar una recarga y se recupera al reintentar', async () => {
    const error = new Error('Error de recarga');
    servicio.listar.mockReturnValue(throwError(() => error));
    component.traerRegistros(false);
    await fixture.whenStable();
    expect(component.datos).toEqual([]);
    expect(component.cargandoRegistros).toBe(false);
    expect(component.paginaActual).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, 'No se pudo actualizar la lista. Intente recargarla.');
    servicio.listar.mockReturnValue(of(registros(1)));
    component.traerRegistros(false);
    expect(component.datos.length).toBe(1);
  });

  it.each(['editar', 'estado'])('libera el bloqueo al cancelar %s', async (operacion) => {
    popUps.confirmarToast.mockResolvedValue(false);
    component.precargar('Tipo', 1, 'Detalle');
    if (operacion === 'editar') await component.editarRegistro(formulario());
    else await component.activarDesactivar(new Event('change'), 1);
    expect(component.guardando).toBe(false);
    expect(component.cambiandoEstado).toBe(false);
    expect(servicio.actualizar1).not.toHaveBeenCalled();
    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
  });

  it.each(['guardar', 'editar', 'estado'])('no limpia la nueva edicion al responder una operacion anterior: %s', async (operacion) => {
    const escritura = new Subject<null>();
    servicio.crear.mockReturnValue(escritura);
    servicio.actualizar1.mockReturnValue(escritura);
    servicio.cambiarEstado.mockReturnValue(escritura);
    component.precargar('Tipo', 1, 'Detalle');
    if (operacion === 'guardar') component.guardar(formulario());
    else if (operacion === 'editar') await component.editarRegistro(formulario());
    else await component.activarDesactivar(new Event('change'), 1);
    component.seleccionarCatalogo('Institución', 'instituciones');
    component.precargar('Hospital', 2, '', '123', 'Calle');
    servicio.listar.mockClear();
    servicio.obtenerRegistrosCatalogosPacientes.mockClear();
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.editar).toBe(true);
    expect(component.variableEntrada.nombre).toBe('Hospital');
    expect(component.guardando).toBe(false);
    expect(component.cambiandoEstado).toBe(false);
    expect(servicio.listar).not.toHaveBeenCalled();
    expect(servicio.obtenerRegistrosCatalogosPacientes).not.toHaveBeenCalled();
  });

  it.each([true, false])('restaura el switch y libera su bloqueo si falla la peticion con filtro %s', async (estado) => {
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

  it('ajusta la pagina al retirar la ultima fila y conserva el filtro', async () => {
    servicio.listar.mockReturnValue(of(registros(6)));
    component.paginaActual = 2;
    component.traerRegistros(true);
    servicio.listar.mockReturnValue(of(registros(5)));
    await component.activarDesactivar(new Event('change'), 6);
    await fixture.whenStable();
    expect(component.paginaActual).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    expect(servicio.listar).toHaveBeenLastCalledWith('tiposCama', true);
  });
});
