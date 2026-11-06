import {
  Component,
  DestroyRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  ChangeDetectorRef,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { CampoValidado } from "../../../../shared/campo-validado/campo-validado";
import { OpcionOtroComponent, OpcionOtroValor } from '../../../../shared/opcion-otro/opcion-otro';
import { crearSeleccionesPendientes, SeleccionPendiente } from '../../../../shared/opcion-otro/crear-seleccion-pendiente';
import { PuestoService } from '../data/puesto-service';
import { UsuarioService } from '../data/usuario-service';
import { HorarioService } from '../../horarios/data/horario-service';
import { RolService } from '../../roles/data/rol-service';
import { PuestoResponse, PersonaDatos, UsuarioRequest, UsuarioResponse } from '../data/usuarioInterfaz';
import { HorarioResponse } from '../../horarios/data/horarioInterfaz';
import { RolResponse } from '../../roles/data/rolInterfaz';
import { ModalAction, ModalService } from '../../../../modal-principal/modal-service';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { Inter_base, Nombre, NombreGet } from '../../../Catalogos/data/nombreInterfaz';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';

const TIEMPO_ESPERA_MS = 5000;

@Component({
  selector: 'app-modal-agregar-uusuario',
  imports: [CommonModule, FormsModule, CampoValidado, OpcionOtroComponent],
  templateUrl: './modal-agregar-uusuario.html',
  styleUrl: './modal-agregar-uusuario.scss',
})
export class ModalAgregarUusuario implements OnInit, OnChanges {
  @Input() isEditing = false;
  @Input() usuarioToEdit?: UsuarioResponse;
  @Input() onSuccess?: () => void;

  contador: number = 0;

  readonly opcionOtroId = -1;
  mostrandoOtroPuesto = false;
  mostrandoOtroEspecialidad = false;
  creandoPuesto = false;
  creandoEspecialidad = false;
  preparandoSelecciones = false;
  guardando = false;
  private puestoAnterior = 0;
  private especialidadAnterior = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly puestoOtro = viewChild<OpcionOtroComponent>('puestoOtro');
  private readonly especialidadOtro = viewChild<OpcionOtroComponent>('especialidadOtro');

  puestos: PuestoResponse[] = [];
  horarios: HorarioResponse[] = [];
  roles: RolResponse[] = [];
  especialidades: Inter_base[] = [];
  rolesAbierto = false;
  private snapshotInicial = '';

  persona: PersonaDatos = {
    cui: '',
    nombres: '',
    apellidos: '',
    sexo: 'MASCULINO',
    fechaNacimiento: '',
    telefono: '',
    email: '',
  };

  usuarioReq: Partial<UsuarioRequest> = {
    puestoId: 0,
    horarioId: 0,
    rolIds: [],
    username: '',
    especialidadId: 0,
    inicioGuardia: null,
    estado: true,
  };

  get modalActions(): ModalAction[] {
    const actions: ModalAction[] = [
      {
        id: 'cancelar',
        label: 'Cancelar',
        className: '_cancelarModal',
        onClick: () => this.cerrarModal(),
      },
    ];

    if (this.contador > 0) {
      actions.push(
        {
          id: 'atras',
          label: 'Atrás',
          className: '_principal',
          icon: 'bi bi-arrow-left',
          onClick: () => this.disminuirContador(),
        },
        {
          id: 'guardar',
          label: this.isEditing ? 'Guardar cambios' : 'Guardar',
          className: '_guardar',
          onClick: () => this.guardarUsuario(),
          disabled: () => this.guardando || this.preparandoSelecciones || !this.puedeGuardarPaso2,
        },
      );
    } else {
      actions.push({
        id: 'siguiente',
        label: 'Siguiente',
        className: '_principal',
        icon: 'bi bi-arrow-right',
        onClick: () => this.aumentarContador(),
        disabled: () => !this.puedeAvanzarPaso1,
      });
    }

    return actions;
  }

  alElegirPuesto(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.puestoAnterior = Number(this.usuarioReq.puestoId ?? 0);
      this.usuarioReq.puestoId = 0;
      this.mostrandoOtroPuesto = true;
      return;
    }

    this.usuarioReq.puestoId = valor;

    const puesto = this.puestos.find((item) => item.id === valor);
    if (this.esPuestoMedico(puesto?.nombre)) {
      this.usuarioReq.horarioId = 0;
      this.usuarioReq.inicioGuardia = null;
    }
  }

  async crearPuesto(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoPuesto) {
      return false;
    }

    this.creandoPuesto = true;
    try {
      const puesto = await firstValueFrom(
        this.puestoService
          .postPuesto(datos.nombre)
          .pipe(timeout(TIEMPO_ESPERA_MS), takeUntilDestroyed(this.destroyRef)),
      );

      if (!puesto || !puesto.id) {
        this.popUps.error('No se pudo crear el puesto.');
        return false;
      }

      this.puestos = [...this.puestos, puesto];
      this.usuarioReq.puestoId = puesto.id;
      this.mostrandoOtroPuesto = false;
      if (this.esPuestoMedico(puesto.nombre)) {
        this.usuarioReq.horarioId = 0;
        this.usuarioReq.inicioGuardia = null;
      }
      return true;
    } catch (error) {
      this.popUps.errorDesdeBackend(error, 'No se pudo crear el puesto.');
      return false;
    } finally {
      this.creandoPuesto = false;
      this.cdr.markForCheck();
    }
  }

  cancelarPuesto(): void {
    this.mostrandoOtroPuesto = false;
    this.usuarioReq.puestoId = this.puestoAnterior;
  }

  alElegirEspecialidad(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.especialidadAnterior = Number(this.usuarioReq.especialidadId ?? 0);
      this.usuarioReq.especialidadId = 0;
      this.mostrandoOtroEspecialidad = true;
      return;
    }

    this.usuarioReq.especialidadId = valor;
  }

  async crearEspecialidad(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoEspecialidad) {
      return false;
    }

    this.creandoEspecialidad = true;
    try {
      const especialidad = await firstValueFrom(
        this.servicioCatalogo
          .crear<Inter_base>('especialidades', { nombre: datos.nombre })
          .pipe(timeout(TIEMPO_ESPERA_MS), takeUntilDestroyed(this.destroyRef)),
      );

      if (especialidad.id == null) {
        this.popUps.error('No se pudo crear la especialidad.');
        return false;
      }

      this.especialidades = [...this.especialidades, especialidad];
      this.usuarioReq.especialidadId = especialidad.id;
      this.mostrandoOtroEspecialidad = false;
      return true;
    } catch (error) {
      this.popUps.errorDesdeBackend(error, 'No se pudo crear la especialidad.');
      return false;
    } finally {
      this.creandoEspecialidad = false;
      this.cdr.markForCheck();
    }
  }

  cancelarEspecialidad(): void {
    this.mostrandoOtroEspecialidad = false;
    this.usuarioReq.especialidadId = this.especialidadAnterior;
  }

  private resolverSeleccionesPendientes(): Promise<boolean> {
    const selecciones: SeleccionPendiente[] = [];

    if (this.mostrandoOtroPuesto) {
      selecciones.push({
        etiqueta: 'Puesto',
        componente: () => this.puestoOtro(),
        crear: (datos: OpcionOtroValor) => this.crearPuesto(datos),
      });
    }

    if (this.mostrandoOtroEspecialidad) {
      selecciones.push({
        etiqueta: 'Especialidad',
        componente: () => this.especialidadOtro(),
        crear: (datos: OpcionOtroValor) => this.crearEspecialidad(datos),
      });
    }

    return crearSeleccionesPendientes(selecciones, (mensaje) =>
      this.popUps.formIncompleto(mensaje),
    );
  }

  alternarRol(rolId: number): void {
    const rolesSeleccionados = this.usuarioReq.rolIds ?? [];
    this.usuarioReq.rolIds = rolesSeleccionados.includes(rolId)
      ? rolesSeleccionados.filter((id) => id !== rolId)
      : [...rolesSeleccionados, rolId];
  }

  rolSeleccionado(rolId: number): boolean {
    return this.usuarioReq.rolIds?.includes(rolId) ?? false;
  }

  get nombresRolesSeleccionados(): string {
    const nombres = this.roles
      .filter((rol) => this.rolSeleccionado(rol.id))
      .map((rol) => rol.nombre);

    return nombres.length ? nombres.join(', ') : 'Seleccione uno o varios roles';
  }

  constructor(
    private puestoService: PuestoService,
    private horarioService: HorarioService,
    private rolService: RolService,
    private usuarioService: UsuarioService,
    private catalogoService: CatalogoService<Nombre, NombreGet>, // eliminar
    private modalService: ModalService,
    private popUps: ModalPopUps,
    private cdr: ChangeDetectorRef,
    private servicioCatalogo: CatalogoService,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDatosEdicion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuarioToEdit'] || changes['isEditing']) {
      this.cargarDatosEdicion();
    }
  }

  get puedeAvanzarPaso1(): boolean {
    return !!(
      this.persona.nombres?.trim() &&
      this.persona.apellidos?.trim() &&
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(this.persona.nombres.trim()) &&
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(this.persona.apellidos.trim()) &&
      /^[0-9]{13}$/.test(this.persona.cui?.trim() || '') &&
      this.persona.sexo &&
      this.persona.fechaNacimiento &&
      /^[0-9]{8}$/.test(this.persona.telefono?.trim() || '') &&
      (!this.persona.email?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.persona.email.trim()))
    );
  }

  get puedeGuardarPaso2(): boolean {
    const puestoValido = !!this.usuarioReq.puestoId || this.mostrandoOtroPuesto;
    const especialidadValida = !!this.usuarioReq.especialidadId || this.mostrandoOtroEspecialidad;

    const horarioValido = this.esMedico || !!this.usuarioReq.horarioId;
    const guardiaValida = !this.esGuardia || !!this.usuarioReq.inicioGuardia;

    return !!(
      puestoValido &&
      horarioValido &&
      guardiaValida &&
      this.usuarioReq.rolIds?.length &&
      this.usuarioReq.username?.trim() &&
      (!this.esMedico || especialidadValida) &&
      (!this.isEditing || this.hayCambios)
    );
  }

  get hayCambios(): boolean {
    return this.crearSnapshot() !== this.snapshotInicial;
  }

  private crearSnapshot(): string {
    return JSON.stringify({
      persona: {
        cui: this.persona.cui.trim(),
        nombres: this.persona.nombres.trim(),
        apellidos: this.persona.apellidos.trim(),
        sexo: this.persona.sexo,
        fechaNacimiento: this.persona.fechaNacimiento,
        telefono: this.persona.telefono?.trim() ?? '',
        email: this.persona.email?.trim() ?? '',
      },
      puestoId: Number(this.usuarioReq.puestoId),
      horarioId: this.esMedico ? 0 : Number(this.usuarioReq.horarioId),
      inicioGuardia: this.esGuardia ? (this.usuarioReq.inicioGuardia ?? '') : '',
      rolIds: [...(this.usuarioReq.rolIds ?? [])].map(Number).sort((a, b) => a - b),
      username: this.usuarioReq.username?.trim() ?? '',
      especialidadId: Number(this.usuarioReq.especialidadId ?? 0),
    });
  }

  get esMedico(): boolean {
    const puesto = this.puestos.find((item) => item.id === Number(this.usuarioReq.puestoId));
    const nombre =
      puesto?.nombre ??
      this.usuarioToEdit?.puesto?.nombre ??
      this.usuarioToEdit?.puestoNombre ??
      '';
    return this.esPuestoMedico(nombre);
  }

  get horarioSeleccionado(): HorarioResponse | undefined {
    return this.horarios.find((item) => item.id === Number(this.usuarioReq.horarioId));
  }

  get esGuardia(): boolean {
    return !this.esMedico && !!this.horarioSeleccionado?.esRotativo;
  }

  private esPuestoMedico(nombre: string | null | undefined): boolean {
    const normalizado = (nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalizado.includes('medic') || normalizado.includes('doctor');
  }

  cargarDatosEdicion(): void {
    if (this.isEditing && this.usuarioToEdit) {
      this.persona = {
        cui: this.usuarioToEdit.cui || this.usuarioToEdit.persona?.cui || '',
        nombres: this.usuarioToEdit.nombres || this.usuarioToEdit.persona?.nombres || '',
        apellidos: this.usuarioToEdit.apellidos || this.usuarioToEdit.persona?.apellidos || '',
        sexo: (this.usuarioToEdit.sexo || this.usuarioToEdit.persona?.sexo || 'MASCULINO') as any,
        fechaNacimiento: this.usuarioToEdit.fechaNacimiento || this.usuarioToEdit.persona?.fechaNacimiento || '',
        telefono: this.usuarioToEdit.telefono || this.usuarioToEdit.persona?.telefono || '',
        email: this.usuarioToEdit.email || this.usuarioToEdit.persona?.email || '',
      };

      const puestoIdVal = this.usuarioToEdit.puesto?.id || (this.usuarioToEdit as any).puestoId || 0;
      const horarioIdVal = this.usuarioToEdit.horario?.id || (this.usuarioToEdit as any).horarioId || 0;
      const rolIdsVal = this.obtenerRolIds(this.usuarioToEdit);
      const especialidad = this.usuarioToEdit.especialidad;
      const especialidadIdVal =
        this.usuarioToEdit.especialidadId ??
        (especialidad && typeof especialidad === 'object' ? especialidad.id : undefined);

      const inicioGuardiaVal = this.usuarioToEdit.inicioGuardia
        ? String(this.usuarioToEdit.inicioGuardia).slice(0, 16)
        : null;

      this.usuarioReq = {
        puestoId: Number(puestoIdVal),
        horarioId: Number(horarioIdVal),
        rolIds: rolIdsVal.map((id: number | string) => Number(id)),
        username: this.usuarioToEdit.username || '',
        especialidadId: Number(especialidadIdVal ?? 0),
        inicioGuardia: inicioGuardiaVal,
        estado: this.usuarioToEdit.estado ?? true,
      };
      this.snapshotInicial = this.crearSnapshot();
      this.cdr.detectChanges();
    }
  }

  cargarCatalogos(): void {
    this.puestoService.getPuestosActivos().subscribe({
      next: (res) => {
        this.puestos = res;
        this.cdr.detectChanges();
      }
    });

    this.horarioService.getHorarios(true).subscribe({
      next: (res) => {
        this.horarios = res;
        this.cdr.detectChanges();
      }
    });

    this.rolService.getRoles(true).subscribe({
      next: (res) => {
        this.roles = res;
        this.cdr.detectChanges();
      }
    });

    this.servicioCatalogo.listar<Inter_base>('especialidades', true).subscribe({
      next: (res) => {
        this.especialidades = res;
        this.cdr.detectChanges();
      }
    });
  }

  aumentarContador(): void {
    if (this.puedeAvanzarPaso1 && this.contador < 1) {
      this.contador++;
    }
  }

  disminuirContador(): void {
    if (this.contador > 0) {
      this.contador--;
    }
  }

  cerrarModal(): void {
    this.modalService.close();
  }

  validarPaso1(): boolean {
    if (!this.persona.nombres?.trim()) {
      this.popUps.formIncompleto('Debe ingresar los nombres.');
      return false;
    }
    if (!this.persona.apellidos?.trim()) {
      this.popUps.formIncompleto('Debe ingresar los apellidos.');
      return false;
    }
    if (!this.persona.cui?.trim()) {
      this.popUps.formIncompleto('Debe ingresar el CUI.');
      return false;
    }
    if (!this.persona.sexo) {
      this.popUps.formIncompleto('Debe seleccionar el sexo.');
      return false;
    }
    if (!this.persona.fechaNacimiento) {
      this.popUps.formIncompleto('Debe ingresar la fecha de nacimiento.');
      return false;
    }
    if (!this.persona.telefono?.trim()) {
      this.popUps.formIncompleto('Debe ingresar un teléfono.');
      return false;
    }
    if (!/^[0-9]{8}$/.test(this.persona.telefono.trim())) {
      this.popUps.formIncompleto('El teléfono debe tener 8 dígitos.');
      return false;
    }
    return true;
  }

  validarPaso2(): boolean {
    if (!this.usuarioReq.puestoId || this.usuarioReq.puestoId === 0) {
      this.popUps.formIncompleto('Debe seleccionar un puesto.');
      return false;
    }
    if (!this.esMedico && (!this.usuarioReq.horarioId || this.usuarioReq.horarioId === 0)) {
      this.popUps.formIncompleto('Debe seleccionar un horario.');
      return false;
    }
    if (this.esGuardia && !this.usuarioReq.inicioGuardia) {
      this.popUps.formIncompleto('Debe ingresar la fecha y hora de inicio de guardia.');
      return false;
    }
    if (!this.usuarioReq.username?.trim()) {
      this.popUps.formIncompleto('Debe ingresar el nombre de usuario.');
      return false;
    }
    if (!this.usuarioReq.rolIds?.length) {
      this.popUps.formIncompleto('Debe seleccionar un rol.');
      return false;
    }
    if (this.esMedico && !this.usuarioReq.especialidadId) {
      this.popUps.formIncompleto('Debe ingresar la especialidad médica.');
      return false;
    }

    return true;
  }

  async guardarUsuario(): Promise<void> {
    if (this.guardando || this.preparandoSelecciones) {
      return;
    }
    if (!this.puedeAvanzarPaso1) {
      this.contador = 0;
      this.popUps.formIncompleto('Completa correctamente los datos personales.');
      return;
    }
    if (!this.puedeGuardarPaso2) {
      this.popUps.formIncompleto('Completa correctamente los datos de usuario.');
      return;
    }

    if (this.isEditing && this.usuarioToEdit) {
      const confirmado = await this.popUps.confirmarToast(
        '¿Desea guardar los cambios realizados en este usuario?',
        'Confirmar cambios',
      );

      if (!confirmado) {
        return;
      }
    }

    this.preparandoSelecciones = true;
    this.cdr.markForCheck();
    try {
      if (!(await this.resolverSeleccionesPendientes())) {
        return;
      }
    } finally {
      this.preparandoSelecciones = false;
      this.cdr.markForCheck();
    }

    const datosPersonales: PersonaDatos = {
      cui: this.persona.cui,
      nombres: this.persona.nombres,
      apellidos: this.persona.apellidos,
      sexo: this.persona.sexo,
      fechaNacimiento: this.persona.fechaNacimiento,
      telefono: this.persona.telefono?.trim() ? this.persona.telefono.trim() : undefined,
      email: this.persona.email?.trim() ? this.persona.email.trim() : undefined,
    };

    const payload: UsuarioRequest = {
      persona: datosPersonales,
      puestoId: Number(this.usuarioReq.puestoId),
      horarioId: this.esMedico ? null : Number(this.usuarioReq.horarioId),
      rolIds: (this.usuarioReq.rolIds ?? []).map((id) => Number(id)),
      username: this.usuarioReq.username!,
      especialidadId: this.esMedico ? Number(this.usuarioReq.especialidadId) : undefined,
      inicioGuardia: this.esGuardia ? this.usuarioReq.inicioGuardia : null,
      estado: this.usuarioReq.estado ?? true,
    };

    this.guardando = true;
    this.cdr.markForCheck();

    if (this.isEditing && this.usuarioToEdit) {
      this.usuarioService.putUsuario(this.usuarioToEdit.id, payload).subscribe({
        next: () => {
          this.popUps.exito('Usuario actualizado exitosamente.', '¡Éxito!', 1800);
          window.setTimeout(() => {
            this.modalService.close();
            this.onSuccess?.();
          }, 1800);
        },
        error: (err) => {
          this.popUps.errorDesdeBackend(err, 'No se pudo actualizar el usuario.');
        },
        complete: () => {
          this.guardando = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.usuarioService.postUsuario(payload).subscribe({
        next: async (respuesta) => {
          await this.popUps.usuarioCreado(this.obtenerPinCreacion(respuesta));
          this.modalService.close();
          window.setTimeout(() => this.onSuccess?.(), 550);
        },
        error: (err) => {
          this.popUps.errorDesdeBackend(err, 'No se pudo guardar el usuario.');
          this.guardando = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.guardando = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  private obtenerRolIds(user: UsuarioResponse): number[] {
    const datos = user as UsuarioResponse & {
      rolIds?: Array<number | string>;
      roles?: Array<{ id: number | string }> | Array<number | string>;
      rolId?: number | string;
    };

    if (datos.rolIds?.length) {
      return datos.rolIds.map((id) => Number(id));
    }

    if (datos.roles?.length) {
      return datos.roles.map((rol) => Number(typeof rol === 'object' ? rol.id : rol));
    }

    if (datos.rolId !== undefined && datos.rolId !== null) {
      return [Number(datos.rolId)];
    }

    return datos.rol?.id ? [Number(datos.rol.id)] : [];
  }

  private obtenerPinCreacion(respuesta: UsuarioResponse | string | number): string | number | null {
    if (typeof respuesta === 'string' || typeof respuesta === 'number') {
      return respuesta;
    }

    const datos = respuesta as UsuarioResponse & {
      pinGenerado?: string | number;
      pinPrimerIngreso?: string | number;
      primerIngresoPin?: string | number;
      pinIngreso?: string | number;
      codigoPin?: string | number;
      respuesta?: { pin?: string | number; pinGenerado?: string | number };
      data?: { pin?: string | number };
    };

    return datos.pin
      ?? datos.pinGenerado
      ?? datos.pinPrimerIngreso
      ?? datos.primerIngresoPin
      ?? datos.pinIngreso
      ?? datos.codigoPin
      ?? datos.respuesta?.pin
      ?? datos.respuesta?.pinGenerado
      ?? datos.data?.pin
      ?? null;
  }
}
