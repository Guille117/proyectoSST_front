import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { of, Subject } from 'rxjs';

import { Proveedores } from './proveedores';
import { ProveedorService } from './data/proveedor-service';
import { proveedorResponse } from './data/proveedorInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';

describe('Proveedores', () => {
  let component: Proveedores;
  let fixture: ComponentFixture<Proveedores>;
  const proveedorService = {
    getProveedores: vi.fn<ProveedorService['getProveedores']>(),
    getProveedorByNombre: vi.fn<ProveedorService['getProveedorByNombre']>(),
    postProveedor: vi.fn<ProveedorService['postProveedor']>(),
    putProveedor: vi.fn<ProveedorService['putProveedor']>(),
    cambiarEstado: vi.fn(() => of(null)),
  };
  const popUps = {
    confirmarToast: vi.fn(async () => false),
    error: vi.fn(),
    exito: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    proveedorService.getProveedores.mockReturnValue(of([]));
    proveedorService.getProveedorByNombre.mockReturnValue(of([]));
    proveedorService.cambiarEstado.mockReturnValue(of(null));
    popUps.confirmarToast.mockResolvedValue(false);
    await TestBed.configureTestingModule({
      imports: [Proveedores],
      providers: [
        { provide: ProveedorService, useValue: proveedorService },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Proveedores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label[for="nombre"]');
    expect(input.placeholder).toBe('Nombre de proveedor');
    expect(label.querySelector('.campo-obligatorio')?.textContent).toBe('*');
  });

  it.each([
    '',
    '   ',
    'CF',
    'cf',
    'Cf',
    ' CF ',
    '1234567-8',
    '12345678-9',
    '1234567-K',
    '12345678-k',
    ' 12345678-K ',
  ])('acepta el NIT %j', (nit) => {
    component.proveedor = { nombre: 'Proveedor', nit, telefono: '', email: '' };
    expect(component.esNitValido()).toBe(true);
    expect(component.isFormValido()).toBe(true);
  });

  it.each(['123456-8', '123456789-0', '12345678', '1234567-A', 'C F', '1234567-88'])(
    'rechaza el NIT %j',
    (nit) => {
      component.proveedor = { nombre: 'Proveedor', nit, telefono: '', email: '' };
      expect(component.esNitValido()).toBe(false);
      expect(component.isFormValido()).toBe(false);
    },
  );

  it('muestra el error al guardar sin desactivar el boton', async () => {
    component.proveedor.nombre = 'Proveedor';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#nit');
    input.value = '123';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button._guardar');
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.classList.contains('input-invalid')).toBe(true);
    expect(
      input.closest('app-campo-validado')?.querySelector('.mensaje-error--visible'),
    ).not.toBeNull();
    expect(popUps.error).toHaveBeenCalled();
    expect(popUps.confirmarToast).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);

    input.value = ' cf ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.classList.contains('input-invalid')).toBe(false);
    expect(component.isFormValido()).toBe(true);
  });

  it('no envia ni confirma un NIT invalido al crear o editar', async () => {
    component.proveedor = { nombre: 'Proveedor', nit: '123', telefono: '', email: '' };
    component.guardarProveedor();
    await component.editarProveedor();
    expect(proveedorService.postProveedor).not.toHaveBeenCalled();
    expect(proveedorService.putProveedor).not.toHaveBeenCalled();
    expect(popUps.confirmarToast).not.toHaveBeenCalled();
  });

  it('mantiene habilitado Guardar cambios con un NIT invalido modificado', async () => {
    component.proveedor = { nombre: 'Proveedor', nit: '123', telefono: '', email: '' };
    component.isEditing = true;
    component.proveedorOriginalClave = 'Proveedor|||CF';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button._guardar');
    expect(button.disabled).toBe(false);
  });

  it.each([true, false])(
    'reutiliza los controles de acciones con estado %s y respeta Cancelar',
    async (estado) => {
      const proveedor = {
        id: 1,
        codigo: 'P001',
        nombre: 'Proveedor',
        nit: 'CF',
        telefono: '',
        email: '',
        estado,
      };
      component.proveedores = [proveedor, { ...proveedor, id: 2, codigo: 'P002' }];
      component.mostrarActivos = estado;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();

      const editButton: HTMLButtonElement =
        fixture.nativeElement.querySelector('button.iconEditar');
      const toggle: HTMLInputElement = fixture.nativeElement.querySelector(
        '.interruptor-estado input',
      );
      if (estado) expect(editButton).not.toBeNull();
      else expect(editButton).toBeNull();
      expect(toggle.checked).toBe(estado);
      toggle.click();
      await fixture.whenStable();
      expect(toggle.checked).toBe(estado);
      expect(proveedorService.cambiarEstado).not.toHaveBeenCalled();

      if (!estado) {
        expect(fixture.nativeElement.querySelectorAll('.interruptor-estado input').length).toBe(2);
        expect(component.isEditing).toBe(false);
        return;
      }

      editButton.click();
      await fixture.whenStable();
      expect(component.idProveedorActualizar).toBe(1);
      expect(component.proveedor).not.toBe(proveedor);
      const filas: NodeListOf<HTMLTableRowElement> =
        fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas[0].classList.contains('selected-row')).toBe(true);
      expect(filas[1].classList.contains('selected-row')).toBe(false);
      expect(fixture.nativeElement.querySelector('button.iconEditar')).toBeNull();
      expect(fixture.nativeElement.querySelector('.interruptor-estado input')).toBeNull();

      fixture.nativeElement.querySelector('button._cancelar').click();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('tbody .selected-row')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('button.iconEditar').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('.interruptor-estado input').length).toBe(2);
    },
  );

  it.each([true, false])('cambia el estado confirmado y recarga el filtro %s', async (estado) => {
    component.cargarProveedores(estado);
    popUps.confirmarToast.mockResolvedValueOnce(true);
    await component.cambiarEstadoProveedor(1);
    expect(proveedorService.cambiarEstado).toHaveBeenCalledWith(1);
    expect(proveedorService.getProveedores).toHaveBeenLastCalledWith(estado);
  });

  it.each([true, false])(
    'muestra la recarga demorada tras guardar desde el filtro %s sin otro clic',
    async (estado) => {
      const selector = fixture.debugElement.query(By.directive(TabSwitch))
        .componentInstance as TabSwitch;
      if (!estado) {
        selector.seleccionarOpcion(false);
        await fixture.whenStable();
      }
      const nuevo: proveedorResponse = {
        id: 2,
        codigo: 'P002',
        nombre: 'Nuevo proveedor',
        nit: '',
        telefono: '',
        email: '',
        estado: true,
      };
      const escritura = new Subject<proveedorResponse>();
      const listado = new Subject<proveedorResponse[]>();
      proveedorService.postProveedor.mockReturnValue(escritura);
      proveedorService.getProveedores.mockReturnValue(listado);
      const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
      nombre.value = nuevo.nombre;
      nombre.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.nativeElement.querySelector('button._guardar').click();
      expect(proveedorService.postProveedor).toHaveBeenCalledOnce();

      escritura.next(nuevo);
      escritura.complete();
      await fixture.whenStable();
      expect(proveedorService.getProveedores).toHaveBeenLastCalledWith(true);
      listado.next([nuevo]);
      listado.complete();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(nuevo.nombre);
      expect(nombre.value).toBe('');
      expect(selector.mostrarActivos).toBe(true);
    },
  );

  it.each(['listado', 'busqueda'])(
    'no sobrescribe la consulta actual con una respuesta anterior de %s',
    async (consulta) => {
      const anterior = new Subject<proveedorResponse[]>();
      const recarga = new Subject<proveedorResponse[]>();
      const nuevo: proveedorResponse = {
        id: 2,
        codigo: 'P002',
        nombre: 'Nuevo proveedor',
        nit: '',
        telefono: '',
        email: '',
        estado: true,
      };
      if (consulta === 'listado') {
        proveedorService.getProveedores.mockReturnValueOnce(anterior);
        component.cargarProveedores(true);
      } else {
        proveedorService.getProveedorByNombre.mockReturnValueOnce(anterior);
        component.nombreProveedor = 'Anterior';
        component.buscarProveedorPorNombre(true);
      }
      proveedorService.getProveedores.mockReturnValueOnce(recarga);
      component.nombreProveedor = '';
      component.cargarProveedores(true);

      recarga.next([nuevo]);
      recarga.complete();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(nuevo.nombre);
      anterior.next([]);
      anterior.complete();
      await fixture.whenStable();
      expect(component.proveedores).toEqual([nuevo]);
      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(nuevo.nombre);
    },
  );

  it.each(['listado', 'busqueda'])(
    'cancela la lectura pendiente de %s al salir del componente',
    (consulta) => {
      const pendiente = new Subject<proveedorResponse[]>();
      if (consulta === 'listado') {
        proveedorService.getProveedores.mockReturnValueOnce(pendiente);
        component.cargarProveedores(true);
      } else {
        proveedorService.getProveedorByNombre.mockReturnValueOnce(pendiente);
        component.nombreProveedor = 'Proveedor';
        component.buscarProveedorPorNombre(true);
      }
      expect(pendiente.observed).toBe(true);
      fixture.destroy();
      expect(pendiente.observed).toBe(false);
    },
  );

  it('avisa si falla la recarga despues de guardar sin presentar filas antiguas como actuales', async () => {
    const anterior: proveedorResponse = {
      id: 1,
      codigo: 'P001',
      nombre: 'Anterior',
      nit: '',
      telefono: '',
      email: '',
      estado: true,
    };
    const nuevo = { ...anterior, id: 2, codigo: 'P002', nombre: 'Nuevo proveedor' };
    proveedorService.getProveedores.mockReturnValueOnce(of([anterior]));
    component.cargarProveedores(true);
    await fixture.whenStable();
    const recarga = new Subject<proveedorResponse[]>();
    proveedorService.getProveedores.mockReturnValueOnce(recarga);
    proveedorService.postProveedor.mockReturnValueOnce(of(nuevo));
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
    nombre.value = nuevo.nombre;
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button._guardar').click();
    const error = new Error('Error al recargar');
    recarga.error(error);
    await fixture.whenStable();
    expect(popUps.exito).toHaveBeenCalledWith('Proveedor guardado exitosamente.');
    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(
      error,
      expect.stringContaining('guardado'),
    );
    expect(component.proveedores).toEqual([]);
    expect(fixture.nativeElement.querySelector('tbody').textContent).not.toContain(anterior.nombre);
    expect(fixture.nativeElement.querySelector('tbody button')?.textContent).toContain(
      'Reintentar',
    );
  });

  it('no duplica crear y envia una copia solo con los campos autorizados', () => {
    const escritura = new Subject<proveedorResponse>();
    proveedorService.postProveedor.mockReturnValue(escritura);
    component.proveedor = { nombre: 'Proveedor', nit: 'CF', telefono: '', email: '' };
    component.guardarProveedor();
    component.guardarProveedor();
    expect(proveedorService.postProveedor).toHaveBeenCalledOnce();
    expect(proveedorService.postProveedor.mock.calls[0][0]).not.toBe(component.proveedor);
    escritura.error(new Error('Error de escritura'));
    component.guardarProveedor();
    expect(proveedorService.postProveedor).toHaveBeenCalledTimes(2);
  });

  it('Cancelar restablece el estado de NgForm y los errores visuales', async () => {
    const nit: HTMLInputElement = fixture.nativeElement.querySelector('#nit');
    nit.value = 'Incorrecto';
    nit.dispatchEvent(new Event('input'));
    nit.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button._guardar').click();
    await fixture.whenStable();
    const formulario = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    expect(formulario.touched).toBe(true);
    fixture.nativeElement.querySelector('button._cancelar').click();
    await fixture.whenStable();
    expect(formulario.touched).toBe(false);
    expect(formulario.dirty).toBe(false);
    expect(formulario.submitted).toBe(false);
    expect(nit.value).toBe('');
    expect(fixture.nativeElement.querySelector('.input-invalid')).toBeNull();
  });

  it('buscar respeta Inactivos y recortar espacios del termino', async () => {
    const selector = fixture.debugElement.query(By.directive(TabSwitch))
      .componentInstance as TabSwitch;
    selector.seleccionarOpcion(false);
    await fixture.whenStable();
    const buscador: HTMLInputElement = fixture.nativeElement.querySelector('.inputB');
    buscador.value = ' Proveedor ';
    buscador.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.btnLupa').click();
    await fixture.whenStable();
    expect(proveedorService.getProveedorByNombre).toHaveBeenCalledWith('Proveedor', false);
    expect(selector.mostrarActivos).toBe(false);
  });

  it('editar captura id y payload antes de confirmar y bloquea confirmaciones repetidas', async () => {
    const original: proveedorResponse = {
      id: 1,
      codigo: 'P001',
      nombre: 'Anterior',
      nit: 'CF',
      telefono: '',
      email: '',
      estado: true,
    };
    component.preActualizarProveedor(original);
    component.proveedor.nombre = 'Actualizado';
    let confirmar: (aceptado: boolean) => void = () => {};
    popUps.confirmarToast.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        confirmar = resolve;
      }),
    );
    proveedorService.putProveedor.mockReturnValueOnce(of(original));
    const pendiente = component.editarProveedor();
    await component.editarProveedor();
    expect(popUps.confirmarToast).toHaveBeenCalledOnce();
    component.proveedor.nombre = 'Cambio posterior';
    confirmar(true);
    await pendiente;
    await fixture.whenStable();
    expect(proveedorService.putProveedor).toHaveBeenCalledWith(1, {
      nombre: 'Actualizado',
      nit: 'CF',
      telefono: '',
      email: '',
    });
    expect(original.nombre).toBe('Anterior');
  });

  it('no notifica una escritura que termina despues de salir del componente', () => {
    const escritura = new Subject<proveedorResponse>();
    proveedorService.postProveedor.mockReturnValueOnce(escritura);
    component.proveedor.nombre = 'Proveedor';
    component.guardarProveedor();
    fixture.destroy();
    escritura.next({
      id: 1,
      codigo: 'P001',
      nombre: 'Proveedor',
      nit: '',
      telefono: '',
      email: '',
      estado: true,
    });
    expect(popUps.exito).not.toHaveBeenCalled();
    expect(proveedorService.getProveedores).toHaveBeenCalledOnce();
  });

  it.each([
    { operacion: 'editar', rechazo: false },
    { operacion: 'editar', rechazo: true },
    { operacion: 'estado', rechazo: false },
    { operacion: 'estado', rechazo: true },
  ])(
    'libera $operacion al cancelar o fallar la confirmacion (rechazo: $rechazo)',
    async ({ operacion, rechazo }) => {
      if (operacion === 'editar') {
        component.preActualizarProveedor({
          id: 1,
          codigo: 'P001',
          nombre: 'Anterior',
          nit: 'CF',
          telefono: '',
          email: '',
          estado: true,
        });
        component.proveedor.nombre = 'Editado';
      }
      if (rechazo)
        popUps.confirmarToast.mockRejectedValueOnce(new Error('Confirmacion interrumpida'));
      else popUps.confirmarToast.mockResolvedValueOnce(false);
      if (operacion === 'editar') await component.editarProveedor();
      else await component.cambiarEstadoProveedor(1);
      await fixture.whenStable();
      expect(component.operacionPendiente).toBe(false);
      expect(proveedorService.putProveedor).not.toHaveBeenCalled();
      expect(proveedorService.cambiarEstado).not.toHaveBeenCalled();
      if (rechazo) expect(popUps.errorDesdeBackend).toHaveBeenCalled();
      if (operacion === 'editar') {
        expect(component.proveedor.nombre).toBe('Editado');
        expect(component.isEditing).toBe(true);
      }
    },
  );

  it('bloquea acciones durante confirmacion, escritura y recarga de estado', async () => {
    const proveedor: proveedorResponse = {
      id: 1,
      codigo: 'P001',
      nombre: 'Proveedor',
      nit: 'CF',
      telefono: '',
      email: '',
      estado: true,
    };
    proveedorService.getProveedores.mockReturnValueOnce(of([proveedor]));
    component.cargarProveedores(true);
    await fixture.whenStable();
    let confirmar: (aceptado: boolean) => void = () => {};
    popUps.confirmarToast.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        confirmar = resolve;
      }),
    );
    const escritura = new Subject<null>();
    const recarga = new Subject<proveedorResponse[]>();
    proveedorService.cambiarEstado.mockReturnValueOnce(escritura);
    proveedorService.getProveedores.mockReturnValueOnce(recarga);
    const toggle: HTMLInputElement = fixture.nativeElement.querySelector(
      '.interruptor-estado input',
    );
    const ejecutar = vi.spyOn(component, 'cambiarEstadoProveedor');
    toggle.click();
    const pendiente = ejecutar.mock.results[0].value;
    await fixture.whenStable();
    expect(toggle.checked).toBe(true);
    expect(toggle.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button._guardar').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.miniSub-container').hasAttribute('inert')).toBe(
      true,
    );
    await component.cambiarEstadoProveedor(1);
    expect(popUps.confirmarToast).toHaveBeenCalledOnce();
    confirmar(true);
    await pendiente;
    await fixture.whenStable();
    expect(proveedorService.cambiarEstado).toHaveBeenCalledOnce();
    escritura.next(null);
    escritura.complete();
    await fixture.whenStable();
    expect(component.cargandoProveedores).toBe(true);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Cargando');
    await component.cambiarEstadoProveedor(1);
    expect(proveedorService.cambiarEstado).toHaveBeenCalledOnce();
    recarga.next([]);
    recarga.complete();
    await fixture.whenStable();
    expect(component.operacionPendiente).toBe(false);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('No se encontraron');
    expect(fixture.nativeElement.querySelector('button._guardar').disabled).toBe(false);
  });

  it('reintenta solo el GET tras una escritura exitosa cuya recarga falla', async () => {
    const nuevo: proveedorResponse = {
      id: 2,
      codigo: 'P002',
      nombre: 'Nuevo',
      nit: 'CF',
      telefono: '',
      email: '',
      estado: true,
    };
    const recarga = new Subject<proveedorResponse[]>();
    proveedorService.postProveedor.mockReturnValueOnce(of(nuevo));
    proveedorService.getProveedores.mockReturnValueOnce(recarga);
    component.proveedor.nombre = nuevo.nombre;
    component.guardarProveedor();
    recarga.error(new Error('Error de lectura'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'Proveedor guardado',
    );
    proveedorService.getProveedores.mockReturnValueOnce(of([nuevo]));
    fixture.nativeElement.querySelector('tbody button').click();
    await fixture.whenStable();
    expect(proveedorService.postProveedor).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(nuevo.nombre);
    expect(component.errorLista).toBe('');
  });

  it('no envia ni notifica una confirmacion resuelta tras destruir el componente', async () => {
    let confirmar: (aceptado: boolean) => void = () => {};
    popUps.confirmarToast.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        confirmar = resolve;
      }),
    );
    const pendiente = component.cambiarEstadoProveedor(1);
    fixture.destroy();
    confirmar(true);
    await pendiente;
    expect(proveedorService.cambiarEstado).not.toHaveBeenCalled();
    expect(popUps.exito).not.toHaveBeenCalled();
  });

  it('marca nombre compuesto solo por espacios como invalido sin desactivar Guardar', async () => {
    const nombre: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
    nombre.value = '   ';
    nombre.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const guardar: HTMLButtonElement = fixture.nativeElement.querySelector('button._guardar');
    expect(guardar.disabled).toBe(false);
    guardar.click();
    await fixture.whenStable();
    expect(nombre.classList.contains('input-invalid')).toBe(true);
    expect(
      nombre.closest('app-campo-validado')?.querySelector('.mensaje-error--visible'),
    ).not.toBeNull();
    expect(proveedorService.postProveedor).not.toHaveBeenCalled();
  });

  it.each([
    { telefono: '', email: '', valido: true },
    { telefono: '12345678', email: 'correo@proveedor.com', valido: true },
    { telefono: '1234567', email: '', valido: false },
    { telefono: '123456789', email: '', valido: false },
    { telefono: '1234567A', email: '', valido: false },
    { telefono: '', email: 'correo', valido: false },
    { telefono: '', email: 'correo@proveedor', valido: false },
    { telefono: '', email: 'correo @proveedor.com', valido: false },
  ])('valida campos opcionales y limites: $telefono / $email', ({ telefono, email, valido }) => {
    component.proveedor = { nombre: 'Proveedor', nit: '', telefono, email };
    expect(component.isFormValido()).toBe(valido);
  });

  it.each(['crear', 'editar', 'estado'])(
    'libera los bloqueos y conserva el formulario al fallar %s',
    async (operacion) => {
      const escritura = new Subject<proveedorResponse>();
      const estado = new Subject<null>();
      const original: proveedorResponse = {
        id: 1,
        codigo: 'P001',
        nombre: 'Anterior',
        nit: 'CF',
        telefono: '',
        email: '',
        estado: true,
      };
      popUps.confirmarToast.mockResolvedValueOnce(true);
      if (operacion === 'editar') {
        component.preActualizarProveedor(original);
        component.proveedor.nombre = 'Editado';
        proveedorService.putProveedor.mockReturnValueOnce(escritura);
        await component.editarProveedor();
      } else if (operacion === 'crear') {
        component.proveedor.nombre = 'Nuevo';
        proveedorService.postProveedor.mockReturnValueOnce(escritura);
        component.guardarProveedor();
      } else {
        proveedorService.cambiarEstado.mockReturnValueOnce(estado);
        await component.cambiarEstadoProveedor(1);
      }
      expect(component.operacionPendiente).toBe(true);
      const error = new Error('Escritura fallida');
      if (operacion === 'estado') estado.error(error);
      else escritura.error(error);
      await fixture.whenStable();
      expect(component.operacionPendiente).toBe(false);
      expect(popUps.exito).not.toHaveBeenCalled();
      expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(error, expect.any(String));
      if (operacion === 'crear') expect(component.proveedor.nombre).toBe('Nuevo');
      if (operacion === 'editar') {
        expect(component.isEditing).toBe(true);
        expect(component.proveedor.nombre).toBe('Editado');
      }
    },
  );
});
