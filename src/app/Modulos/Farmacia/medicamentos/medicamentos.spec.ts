import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm, NgModel } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ServicioMedicamento } from './data/servicio-medicamento';
import { MedicamentoLogFiltros, MedicamentoLogRequest, MedicamentoLogResponse } from './data/interfaz-medicamento';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base, Inter_unidadMedida } from '../../Catalogos/data/nombreInterfaz';
import { Observable, of, Subject, throwError } from 'rxjs';

import { Medicamentos } from './medicamentos';

describe('Medicamentos', () => {
  let component: Medicamentos;
  let fixture: ComponentFixture<Medicamentos>;
  const catalogos = {
    listar: vi.fn<(recurso: string) => Observable<Inter_base[]>>(() => of([])),
  };
  const servicioMedicamento = {
    traerMedicamentoLog: vi.fn<(activo: boolean) => Observable<MedicamentoLogResponse[]>>(() => of([])),
    buscarMedicamentoLog: vi.fn<(filtros: MedicamentoLogFiltros) => Observable<MedicamentoLogResponse[]>>(() => of([])),
    buscarMedLogActualizar: vi.fn<(id: number, activo: boolean) => Observable<MedicamentoLogRequest>>(),
    actualizarMedicamentoLog: vi.fn<(id: number, medicamento: MedicamentoLogRequest) => Observable<unknown>>(),
    crearMedicamentoLog: vi.fn<(medicamento: MedicamentoLogRequest) => Observable<unknown>>(),
  };
  const popUp = {
    confirmarToast: vi.fn<() => Promise<boolean>>(),
    exito: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    catalogos.listar.mockReset();
    catalogos.listar.mockReturnValue(of([]));
    servicioMedicamento.traerMedicamentoLog.mockReset();
    servicioMedicamento.traerMedicamentoLog.mockReturnValue(of([]));
    servicioMedicamento.buscarMedicamentoLog.mockReset();
    servicioMedicamento.buscarMedicamentoLog.mockReturnValue(of([]));
    servicioMedicamento.buscarMedLogActualizar.mockReset();
    servicioMedicamento.actualizarMedicamentoLog.mockReset();
    servicioMedicamento.actualizarMedicamentoLog.mockReturnValue(of(null));
    servicioMedicamento.crearMedicamentoLog.mockReset();
    servicioMedicamento.crearMedicamentoLog.mockReturnValue(of(null));
    popUp.exito.mockReset();
    popUp.confirmarToast.mockReset();
    popUp.confirmarToast.mockResolvedValue(true);
    popUp.errorDesdeBackend.mockReset();
    await TestBed.configureTestingModule({
      imports: [Medicamentos],
      providers: [
        { provide: ServicioMedicamento, useValue: servicioMedicamento },
        { provide: CatalogoService, useValue: catalogos },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Medicamentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('llena los cuatro selects con nombres e ids al recibir los catalogos demorados', async () => {
    const unidades = new Subject<Inter_unidadMedida[]>();
    const fabricantes = new Subject<Inter_base[]>();
    const presentaciones = new Subject<Inter_base[]>();
    const vias = new Subject<Inter_base[]>();
    catalogos.listar.mockImplementation((recurso) => {
      switch (recurso) {
        case 'unidadMedida':
          return unidades;
        case 'marca':
          return fabricantes;
        case 'presentacion':
          return presentaciones;
        case 'viaAdmin':
          return vias;
        default:
          return of([]);
      }
    });
    component.llenarSelects();
    unidades.next([{ id: 11, nombre: 'Miligramos', abreviatura: 'mg' }]);
    unidades.complete();
    fabricantes.next([{ id: 12, nombre: 'Fabricante de prueba' }]);
    fabricantes.complete();
    presentaciones.next([{ id: 13, nombre: 'Tableta' }]);
    presentaciones.complete();
    vias.next([{ id: 14, nombre: 'Oral' }]);
    vias.complete();
    await fixture.whenStable();
    for (const [id, valor, nombre] of [
      ['unidadMedidaMedicamento', '11', 'Miligramos'],
      ['fabricanteMedicamento', '12', 'Fabricante de prueba'],
      ['presentacionMedicamento', '13', 'Tableta'],
      ['viaAdministracionMedicamento', '14', 'Oral'],
    ]) {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector(`#${id}`);
      expect(select.options.length).toBe(2);
      expect(select.options[1].value).toContain(valor);
      expect(select.options[1].textContent).toBe(nombre);
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
    expect(component.medicamento).toMatchObject({
      unidadMedidaId: 11,
      marcaId: 12,
      presentacionId: 13,
      viaAdminId: 14,
    });
    expect(fixture.debugElement.queryAll(By.directive(NgModel)).length).toBe(6);
  });

  it('usa los estilos compartidos y Cancelar reinicia el formulario de medicamentos', async () => {
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreMedicamento');
    const concentracion: HTMLInputElement =
      fixture.nativeElement.querySelector('#concentracionMedicamento');
    nombre.value = 'Medicamento escrito';
    nombre.dispatchEvent(new Event('input'));
    nombre.dispatchEvent(new Event('blur'));
    concentracion.value = '500';
    concentracion.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const cancelar: HTMLButtonElement = fixture.nativeElement.querySelector('.botones ._cancelar');
    const guardar: HTMLButtonElement = fixture.nativeElement.querySelector('.botones ._guardar');
    expect(cancelar.classList.contains('btn')).toBe(true);
    expect(guardar.classList.contains('btn')).toBe(true);
    expect(cancelar.type).toBe('button');
    expect(guardar.type).toBe('button');
    expect(fixture.debugElement.queryAll(By.directive(NgModel)).length).toBe(6);
    cancelar.click();
    await fixture.whenStable();
    expect(nombre.value).toBe('');
    expect(formulario.dirty).toBe(false);
    expect(formulario.touched).toBe(false);
    expect(formulario.submitted).toBe(false);
    expect(component.actualizar).toBe(false);
    expect(component.hayCambiosMedicamento()).toBe(false);
  });

  it('reune los cuatro criterios, texto y lupa en un unico buscador', () => {
    const buscadores: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.buscador');
    expect(buscadores.length).toBe(1);
    const selector = buscadores[0].querySelector<HTMLSelectElement>('select.selector');
    expect(Array.from(selector!.options, (opcion) => opcion.textContent?.trim())).toEqual([
      'Nombre',
      'Fabricante',
      'Presentación',
      'Vía de administración',
    ]);
    expect(buscadores[0].querySelector('input.inputB')).not.toBeNull();
    expect(buscadores[0].querySelector('button.btnLupa .bi-search')).not.toBeNull();
    expect(buscadores[0].querySelector('button')?.getAttribute('type')).toBe('button');
  });

  it.each([
    ['fabricante', 'marca', 12, 'Fabricante de prueba'],
    ['presentacion', 'presentacion', 13, 'Tableta'],
    ['viaAdministracion', 'viaAdmin', 14, 'Oral'],
  ] as const)('sustituye el input por el catalogo de %s y actualiza sus opciones', async (criterio, recurso, id, nombre) => {
    const datos = new Subject<Inter_base[]>();
    catalogos.listar.mockImplementation((catalogo) => catalogo === recurso ? datos : of([]));
    component.llenarSelects();
    const selector: HTMLSelectElement = fixture.nativeElement.querySelector('.buscador .selector');
    selector.value = criterio;
    selector.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.buscador input')).toBeNull();
    const opciones: HTMLSelectElement = fixture.nativeElement.querySelector('.buscador select.inputB');
    expect(opciones.options.length).toBe(1);
    datos.next([{ id, nombre }]);
    datos.complete();
    await fixture.whenStable();
    expect(opciones.options.length).toBe(2);
    expect(opciones.options[1].textContent).toBe(nombre);
    expect(opciones.options[1].value).toBe(String(id));
    opciones.value = String(id);
    opciones.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(component.valorBusquedaCatalogo).toBe(String(id));

    selector.value = 'nombre';
    selector.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(component.valorBusquedaCatalogo).toBe('');
    expect(fixture.nativeElement.querySelector('.buscador select.inputB')).toBeNull();
    expect(fixture.nativeElement.querySelector('.buscador input.inputB')).not.toBeNull();
  });

  it('muestra las seis columnas solicitadas sin registros inventados', () => {
    const columnas: NodeListOf<HTMLTableCellElement> =
      fixture.nativeElement.querySelectorAll('thead th');
    expect(Array.from(columnas, (columna) => columna.textContent?.trim())).toEqual([
      'No.',
      'Nombre',
      'Fabricante',
      'Concentración',
      'Presentación',
      'Vía de administración',
      'Acciones',
    ]);
  });

  it('muestra el icono de editar habitual en las acciones de cada medicamento', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(
      of([
        {
          id: 1,
          nombre: 'Medicamento de prueba',
          dosis: 500,
          marca: 'Fabricante',
          presentacion: 'Tableta',
          viaAdministracion: 'Oral',
          unidadMedida: 'mg',
          estado: true,
        },
      ]),
    );
    component.listarMedicamentos();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'Medicamento de prueba',
    );
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('tbody button.iconEditar');
    expect(boton).not.toBeNull();
    expect(boton.type).toBe('button');
    expect(boton.getAttribute('aria-label')).toBe('Editar medicamento');
    expect(boton.querySelector('.bi-pencil-square')).not.toBeNull();
  });

  it('detecta cambios comparando cada campo con el medicamento original', async () => {
    const original: MedicamentoLogRequest = {
      nombre: 'Medicamento',
      dosis: 500,
      unidadMedidaId: 11,
      marcaId: 12,
      presentacionId: 13,
      viaAdminId: 14,
    };
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(of(original));
    expect(component.hayCambiosMedicamento()).toBe(false);
    component.preactualizar(1);
    await fixture.whenStable();
    expect(component.hayCambiosMedicamento()).toBe(false);

    component.medicamento.nombre = '  Medicamento  ';
    expect(component.hayCambiosMedicamento()).toBe(false);
    component.medicamento.dosis = 250;
    expect(component.hayCambiosMedicamento()).toBe(true);
    component.medicamento.dosis = original.dosis;
    component.medicamento.viaAdminId = 15;
    expect(component.hayCambiosMedicamento()).toBe(true);
    component.medicamento.viaAdminId = original.viaAdminId;
    expect(component.hayCambiosMedicamento()).toBe(false);
  });

  it('muestra Actualizar y lo habilita solo si hay cambios', async () => {
    const original: MedicamentoLogRequest = {
      nombre: 'Medicamento',
      dosis: 500,
      unidadMedidaId: 11,
      marcaId: 12,
      presentacionId: 13,
      viaAdminId: 14,
    };
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(of(original));
    component.preactualizar(1);
    await fixture.whenStable();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.botones ._guardar');
    expect(component.actualizar).toBe(true);
    expect(boton.textContent?.trim()).toBe('Actualizar');
    expect(boton.disabled).toBe(true);

    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreMedicamento');
    nombre.value = 'Medicamento actualizado';
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(boton.disabled).toBe(false);
    boton.click();
    await fixture.whenStable();

    expect(servicioMedicamento.actualizarMedicamentoLog).toHaveBeenCalledWith(1, {
      ...original,
      nombre: 'Medicamento actualizado',
    });
    expect(servicioMedicamento.crearMedicamentoLog).not.toHaveBeenCalled();
    expect(component.actualizar).toBe(false);
  });

  it('deshabilita las acciones de todas las filas y usa el resaltado compartido hasta cancelar', async () => {
    const registros: MedicamentoLogResponse[] = [1, 2].map((id) => ({
      id, nombre: `Medicamento ${id}`, dosis: 500, marca: 'Fabricante',
      presentacion: 'Tableta', viaAdministracion: 'Oral', unidadMedida: 'mg', estado: true,
    }));
    servicioMedicamento.traerMedicamentoLog.mockReturnValue(of(registros));
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(of({
      nombre: 'Medicamento 2', dosis: 500, unidadMedidaId: 1, marcaId: 1,
      presentacionId: 1, viaAdminId: 1,
    }));
    component.listarMedicamentos();
    await fixture.whenStable();
    const botones: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('tbody .iconEditar');
    expect(botones.length).toBe(2);
    botones[1].click();
    await fixture.whenStable();

    const acciones: NodeListOf<HTMLButtonElement | HTMLInputElement> =
      fixture.nativeElement.querySelectorAll('tbody button, tbody input');
    expect(acciones.length).toBe(4);
    expect(Array.from(acciones).every((accion) => accion.disabled)).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('tbody .acciones-deshabilitadas').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('tbody .selected-row').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody .selected-row').textContent).toContain('Medicamento 2');
    servicioMedicamento.buscarMedLogActualizar.mockClear();
    for (const accion of acciones) accion.click();
    expect(servicioMedicamento.buscarMedLogActualizar).not.toHaveBeenCalled();
    expect(popUp.confirmarToast).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('.botones ._cancelar').click();
    await fixture.whenStable();

    expect(component.idActualizar).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody .selected-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.acciones-deshabilitadas')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('tbody button, tbody input').length).toBe(4);
    expect(Array.from(acciones).every((accion) => !accion.disabled)).toBe(true);
  });

  it.each(['exito', 'error', 'rechazada'])('mantiene las acciones deshabilitadas hasta una actualizacion exitosa: %s', async (resultado) => {
    const registro: MedicamentoLogResponse = {
      id: 1, nombre: 'Medicamento', dosis: 500, marca: 'Fabricante',
      presentacion: 'Tableta', viaAdministracion: 'Oral', unidadMedida: 'mg', estado: true,
    };
    const respuesta = new Subject<unknown>();
    servicioMedicamento.traerMedicamentoLog.mockReturnValue(of([registro]));
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(of({
      nombre: 'Medicamento', dosis: 500, unidadMedidaId: 1, marcaId: 1,
      presentacionId: 1, viaAdminId: 1,
    }));
    servicioMedicamento.actualizarMedicamentoLog.mockReturnValueOnce(respuesta);
    popUp.confirmarToast.mockResolvedValueOnce(resultado !== 'rechazada');
    component.listarMedicamentos();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('tbody .iconEditar').click();
    await fixture.whenStable();
    component.medicamento.nombre = 'Medicamento actualizado';
    await component.actualizarMedicamento();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('tbody .iconEditar').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('tbody input[role="switch"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('tbody .selected-row')).not.toBeNull();
    if (resultado === 'exito') {
      respuesta.next(null);
      respuesta.complete();
    } else if (resultado === 'error') {
      respuesta.error(new Error('Error al actualizar'));
    } else {
      expect(servicioMedicamento.actualizarMedicamentoLog).not.toHaveBeenCalled();
    }
    await fixture.whenStable();

    expect(component.actualizar).toBe(resultado !== 'exito');
    expect(fixture.nativeElement.querySelector('tbody .selected-row') !== null).toBe(resultado !== 'exito');
    expect(fixture.nativeElement.querySelector('tbody .iconEditar').disabled).toBe(resultado !== 'exito');
    expect(fixture.nativeElement.querySelector('tbody input[role="switch"]').disabled).toBe(resultado !== 'exito');
    if (resultado === 'exito') expect(component.idActualizar).toBeNull();
  });

  it('no envia una actualizacion si se cancela mientras espera confirmacion', async () => {
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(of({
      nombre: 'Medicamento', dosis: 500, unidadMedidaId: 1, marcaId: 1,
      presentacionId: 1, viaAdminId: 1,
    }));
    let confirmar: ((valor: boolean) => void) | undefined;
    popUp.confirmarToast.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      confirmar = resolve;
    }));
    component.preactualizar(1);
    component.medicamento.nombre = 'Medicamento actualizado';
    const pendiente = component.actualizarMedicamento();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    component.cancelar(formulario);
    confirmar?.(true);
    await pendiente;

    expect(component.actualizar).toBe(false);
    expect(component.idActualizar).toBeNull();
    expect(servicioMedicamento.actualizarMedicamentoLog).not.toHaveBeenCalled();
  });

  it('ignora una carga de edicion que llega despues de cancelar', () => {
    const respuesta = new Subject<MedicamentoLogRequest>();
    servicioMedicamento.buscarMedLogActualizar.mockReturnValueOnce(respuesta);
    component.preactualizar(1);
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    component.cancelar(formulario);
    respuesta.next({
      nombre: 'Medicamento', dosis: 500, unidadMedidaId: 1, marcaId: 1,
      presentacionId: 1, viaAdminId: 1,
    });
    respuesta.complete();

    expect(component.actualizar).toBe(false);
    expect(component.medicamento.nombre).toBe('');
    expect(component.hayCambiosMedicamento()).toBe(false);
  });

  it('no permite editar inactivos y mantiene disponible el cambio de estado', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([{
      id: 1, nombre: 'Medicamento inactivo', dosis: 500, marca: 'Fabricante',
      presentacion: 'Tableta', viaAdministracion: 'Oral', unidadMedida: 'mg', estado: false,
    }]));
    component.cambiarFiltroActivo(false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('tbody .iconEditar')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody input[role="switch"]')).not.toBeNull();
    component.preactualizar(1);
    expect(component.actualizar).toBe(false);
    expect(servicioMedicamento.buscarMedLogActualizar).not.toHaveBeenCalled();
  });

  it.each([true, false])('muestra estado=%s en el switch y notifica su cambio', async (estado) => {
    const medicamento: MedicamentoLogResponse = {
      id: 1,
      nombre: 'Medicamento de prueba',
      dosis: 500,
      marca: 'Fabricante',
      presentacion: 'Tableta',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      estado,
    };
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.listarMedicamentos();
    await fixture.whenStable();
    fixture.detectChanges();

    const interruptor: HTMLInputElement =
      fixture.nativeElement.querySelector('input[role="switch"]');
    const cambiarEstado = vi.spyOn(component, 'cambiarEstadoMed').mockResolvedValue(undefined);
    expect(interruptor.checked).toBe(estado);
    interruptor.click();
    await fixture.whenStable();
    expect(cambiarEstado).toHaveBeenCalledWith(medicamento.id);
  });

  it('muestra dos inputs y cuatro selects del formulario de medicamentos', () => {
    const campos: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('form input, form select');
    expect(Array.from(campos, (campo) => campo.getAttribute('name'))).toEqual([
      'nombre',
      'concentracion',
      'unidadMedida',
      'viaAdministracion',
      'presentacion',
      'fabricante',
    ]);
    expect(fixture.nativeElement.querySelectorAll('form input').length).toBe(2);
    const selects: NodeListOf<HTMLSelectElement> =
      fixture.nativeElement.querySelectorAll('form select');
    expect(selects.length).toBe(4);
    for (const select of selects) {
      expect(select.options.length).toBe(1);
      expect(select.selectedIndex).toBe(0);
      expect(select.required).toBe(false);
    }
  });

  it('cambia a inactivos sin ocultar campos del formulario de medicamentos', async () => {
    const selector = fixture.debugElement.query(By.directive(TabSwitch))
      .componentInstance as TabSwitch;
    fixture.nativeElement.querySelectorAll('app-tab-switch .miniSubMenu > div')[1].click();
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(false);
    expect(servicioMedicamento.traerMedicamentoLog).toHaveBeenLastCalledWith(false);
    expect(selector.mostrarActivos).toBe(false);
    const campos: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('form input, form select');
    expect(Array.from(campos, (campo) => campo.getAttribute('name'))).toEqual([
      'nombre',
      'concentracion',
      'unidadMedida',
      'viaAdministracion',
      'presentacion',
      'fabricante',
    ]);
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(7);
  });

  it('enlaza nombre y dosis a medicamento y conserva los valores al cambiar de estado', async () => {
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombreMedicamento');
    const concentracion: HTMLInputElement =
      fixture.nativeElement.querySelector('#concentracionMedicamento');
    nombre.value = 'Nombre escrito';
    nombre.dispatchEvent(new Event('input'));
    concentracion.value = '500';
    concentracion.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(component.medicamento.nombre).toBe('Nombre escrito');
    expect(component.medicamento.dosis).toBe(500);
    expect(fixture.debugElement.queryAll(By.directive(NgModel)).length).toBe(6);
    component.cambiarFiltroActivo(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#concentracionMedicamento')).not.toBeNull();
    component.cambiarFiltroActivo(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#concentracionMedicamento').value).toBe('500');
    expect(nombre.value).toBe('Nombre escrito');
  });

  it('busca por nombre al pulsar la lupa y asigna la respuesta a medicamentos', async () => {
    const respuesta = new Subject<MedicamentoLogResponse[]>();
    const resultados: MedicamentoLogResponse[] = [{
      id: 1,
      nombre: 'Amoxicilina',
      dosis: 500,
      marca: 'Fabricante',
      presentacion: 'Tableta',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      estado: true,
    }];
    servicioMedicamento.buscarMedicamentoLog.mockReturnValueOnce(respuesta);
    const texto: HTMLInputElement = fixture.nativeElement.querySelector('.inputB');
    texto.value = ' amox ';
    texto.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.btnLupa').click();
    await fixture.whenStable();
    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({ nombre: 'amox', activo: true });
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
    respuesta.next(resultados);
    respuesta.complete();
    await fixture.whenStable();
    expect(component.medicamentos).toBe(resultados);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Amoxicilina');
  });

  it.each([
    ['fabricante', { marcaId: 2 }],
    ['presentacion', { presentacionId: 2 }],
    ['viaAdministracion', { viaAdminId: 2 }],
  ])('busca por %s usando el ID seleccionado y activo=false', async (criterio, filtro) => {
    component.cambiarCriterioBusqueda(criterio as string);
    component.valorBusquedaCatalogo = '2';
    component.mostrarActivos = false;
    fixture.nativeElement.querySelector('.btnLupa').click();
    await fixture.whenStable();

    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({ ...filtro, activo: false });
  });

  it.each(['nombre', 'fabricante', 'presentacion', 'viaAdministracion'])('omite el filtro vacio de %s', (criterio) => {
    component.cambiarCriterioBusqueda(criterio);
    component.textoBusqueda = '   ';
    component.buscarMedicamentos();

    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({ activo: true });
  });

  it('permite buscar por nombre pulsando Enter', async () => {
    const texto: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    texto.value = 'amox';
    texto.dispatchEvent(new Event('input'));
    texto.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();

    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({ nombre: 'amox', activo: true });
  });

  it('informa errores de busqueda sin reemplazar los medicamentos', () => {
    const error = new Error('Error de busqueda');
    const originales = component.medicamentos;
    servicioMedicamento.buscarMedicamentoLog.mockReturnValueOnce(throwError(() => error));
    component.buscarMedicamentos();

    expect(component.medicamentos).toBe(originales);
    expect(popUp.errorDesdeBackend).toHaveBeenCalledWith(error, 'Error al buscar los medicamentos.');
  });

  it('permite cambiar entre activos e inactivos con las flechas del teclado', async () => {
    const selector: HTMLElement = fixture.nativeElement.querySelector('app-tab-switch');
    expect(selector.tabIndex).toBe(0);
    selector.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(false);
    expect(servicioMedicamento.traerMedicamentoLog).toHaveBeenLastCalledWith(false);
    expect(selector.getAttribute('aria-label')).toBe('Estado de medicamentos');
    selector.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(true);
    expect(servicioMedicamento.traerMedicamentoLog).toHaveBeenLastCalledWith(true);
  });
});
