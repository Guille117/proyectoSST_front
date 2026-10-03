import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { proveedorRequest, proveedorResponse } from './data/proveedorInterfaz';
import { ProveedorService } from './data/proveedor-service';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';

@Component({
  selector: 'app-proveedores',
  imports: [FormsModule, CampoValidado, TabSwitch],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.scss',
})
export class Proveedores implements OnInit, OnDestroy {
  private peticionProveedores?: Subscription;
  private peticionEscritura?: Subscription;
  private destruido = false;
  private versionConsulta = 0;
  private consultaActual = { activos: true, nombre: '' };
  private mensajeErrorRecarga =
    'No se pudo actualizar la lista de proveedores. Intente nuevamente.';

  constructor(
    private proveedorService: ProveedorService,
    private cdr: ChangeDetectorRef,
    private popUps: PopUps,
  ) {}

  // ------------ ESTADO ------------
  proveedor: proveedorRequest = {
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
  };

  proveedores: proveedorResponse[] = [];
  nombreProveedor = '';
  isEditing = false;
  idProveedorActualizar: number | null = null;
  proveedorOriginalClave = '';
  mostrarActivos = true;
  cargandoProveedores = false;
  guardando = false;
  cambiandoEstado = false;
  errorLista = '';
  readonly nombrePattern = /\S/;
  readonly telefonoPattern = /^[0-9]{8}$/;
  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  get operacionPendiente(): boolean {
    return this.guardando || this.cambiandoEstado;
  }

  // ------------ INICIALIZACION ------------
  ngOnInit(): void {
    this.cargarProveedores(true);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.versionConsulta++;
    this.peticionProveedores?.unsubscribe();
    this.peticionEscritura?.unsubscribe();
  }

  // ------------ CONSULTAS Y FILTROS ------------
  cargarProveedores(activos: boolean): void {
    if (this.destruido || this.operacionPendiente) return;
    this.consultarProveedores(activos, this.nombreProveedor.trim());
  }

  buscarProveedorPorNombre(activos = this.mostrarActivos): void {
    this.cargarProveedores(activos);
  }

  reintentarCarga(): void {
    if (this.destruido || this.operacionPendiente) return;
    this.consultarProveedores(
      this.consultaActual.activos,
      this.consultaActual.nombre,
      this.mensajeErrorRecarga,
    );
  }

  private consultarProveedores(
    activos: boolean,
    nombre: string,
    mensajeError = 'No se pudo actualizar la lista de proveedores. Intente nuevamente.',
  ): void {
    const version = ++this.versionConsulta;
    this.peticionProveedores?.unsubscribe();
    this.consultaActual = { activos, nombre };
    this.nombreProveedor = nombre;
    this.mostrarActivos = activos;
    this.mensajeErrorRecarga = mensajeError;
    this.cargandoProveedores = true;
    this.errorLista = '';
    this.cdr.markForCheck();
    const peticion = nombre
      ? this.proveedorService.getProveedorByNombre(nombre, activos)
      : this.proveedorService.getProveedores(activos);
    this.peticionProveedores = peticion
      .pipe(
        finalize(() => {
          if (this.destruido || version !== this.versionConsulta) return;
          this.cargandoProveedores = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          if (this.destruido || version !== this.versionConsulta) return;
          this.proveedores = data;
          this.cargandoProveedores = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido || version !== this.versionConsulta) return;
          this.proveedores = [];
          this.errorLista = mensajeError;
          this.popUps.errorDesdeBackend(error, mensajeError);
        },
      });
  }

  // ------------ GUARDAR PROVEEDOR ------------
  guardarProveedor(formulario?: NgForm): void {
    if (this.destruido || this.operacionPendiente || this.cargandoProveedores || this.isEditing)
      return;
    if (!this.validarFormulario(formulario)) return;
    const datos = this.obtenerDatosProveedor(this.proveedor);
    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionEscritura = this.proveedorService
      .postProveedor(datos)
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;
          this.popUps.exito('Proveedor guardado exitosamente.');
          this.limpiarFormulario(formulario);
          this.consultarProveedores(
            true,
            '',
            'Proveedor guardado; no se pudo actualizar la lista. Intente nuevamente.',
          );
        },
        error: (error) => {
          if (!this.destruido)
            this.popUps.errorDesdeBackend(
              error,
              'No se pudo guardar el proveedor. Intente nuevamente.',
            );
        },
      });
  }

  // ------------ EDITAR PROVEEDOR ------------
  preActualizarProveedor(prov: proveedorResponse, formulario?: NgForm): void {
    if (this.destruido || this.operacionPendiente || this.cargandoProveedores || this.isEditing)
      return;
    this.proveedor = this.obtenerDatosProveedor(prov);
    formulario?.resetForm(this.proveedor);
    this.proveedorOriginalClave = this.obtenerClaveProveedor(prov);
    this.isEditing = true;
    this.idProveedorActualizar = prov.id;
    this.cdr.markForCheck();
  }

  async editarProveedor(formulario?: NgForm): Promise<void> {
    if (
      this.destruido ||
      this.operacionPendiente ||
      this.cargandoProveedores ||
      !this.isEditing ||
      this.idProveedorActualizar === null
    )
      return;
    if (!this.validarFormulario(formulario) || !this.tieneCambiosValidosParaActualizar()) return;
    const id = this.idProveedorActualizar;
    const datos = this.obtenerDatosProveedor(this.proveedor);
    const consulta = { ...this.consultaActual };
    this.guardando = true;
    this.cdr.markForCheck();
    const confirmado = await this.confirmarOperacion('¿Deseas guardar los cambios realizados?');
    if (!confirmado || this.destruido || !this.isEditing || id !== this.idProveedorActualizar) {
      this.guardando = false;
      if (!this.destruido) this.cdr.markForCheck();
      return;
    }

    this.peticionEscritura = this.proveedorService
      .putProveedor(id, datos)
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;
          this.popUps.exito('Proveedor actualizado exitosamente.');
          if (this.isEditing && id === this.idProveedorActualizar)
            this.limpiarFormulario(formulario);
          this.consultarProveedores(
            consulta.activos,
            consulta.nombre,
            'Proveedor actualizado; no se pudo actualizar la lista. Intente nuevamente.',
          );
        },
        error: (error) => {
          if (!this.destruido)
            this.popUps.errorDesdeBackend(
              error,
              'No se pudo actualizar el proveedor. Intente nuevamente.',
            );
        },
      });
  }

  // ------------ CAMBIAR ESTADO ------------
  async cambiarEstadoProveedor(id: number, event?: Event): Promise<void> {
    if (event?.target instanceof HTMLInputElement) {
      event.target.checked =
        this.proveedores.find((prov) => prov.id === id)?.estado ?? this.mostrarActivos;
    }
    if (this.destruido || this.isEditing || this.operacionPendiente || this.cargandoProveedores)
      return;
    const consulta = { ...this.consultaActual };
    this.cambiandoEstado = true;
    this.cdr.markForCheck();
    const confirmado = await this.confirmarOperacion('¿Deseas cambiar el estado del proveedor?');
    if (!confirmado || this.destruido) {
      this.cambiandoEstado = false;
      if (!this.destruido) this.cdr.markForCheck();
      return;
    }

    this.peticionEscritura = this.proveedorService
      .cambiarEstado(id)
      .pipe(
        finalize(() => {
          this.cambiandoEstado = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;
          this.popUps.exito('Estado del proveedor cambiado exitosamente.');
          this.consultarProveedores(
            consulta.activos,
            consulta.nombre,
            'Estado actualizado; no se pudo actualizar la lista. Intente nuevamente.',
          );
        },
        error: (error) => {
          if (!this.destruido)
            this.popUps.errorDesdeBackend(
              error,
              'No se pudo cambiar el estado del proveedor. Intente nuevamente.',
            );
        },
      });
  }

  private async confirmarOperacion(mensaje: string): Promise<boolean> {
    try {
      return await this.popUps.confirmarToast(mensaje, 'Confirmación');
    } catch (error) {
      if (!this.destruido)
        this.popUps.errorDesdeBackend(
          error,
          'No se pudo confirmar la operación. Intente nuevamente.',
        );
      return false;
    }
  }

  // ------------ VALIDACION Y DATOS ------------
  esNombreValido(): boolean {
    return !!this.proveedor.nombre?.trim();
  }

  esTelefonoValido(): boolean {
    return !this.proveedor.telefono || this.telefonoPattern.test(this.proveedor.telefono);
  }

  esEmailValido(): boolean {
    return !this.proveedor.email || this.emailPattern.test(this.proveedor.email);
  }

  esNitValido(): boolean {
    const nit = this.proveedor.nit ?? '';
    const nitRegex = /^(?:CF|[0-9]{7,8}-[0-9Kk])$/i;
    const nitValido = !nit.trim() || nitRegex.test(nit.trim());
    return nitValido;
  }

  isFormValido(): boolean {
    return (
      this.esNombreValido() && this.esTelefonoValido() && this.esEmailValido() && this.esNitValido()
    );
  }

  private validarFormulario(formulario?: NgForm): boolean {
    formulario?.form.markAllAsTouched();
    if (this.isFormValido()) {
      return true;
    }

    this.popUps.error(
      this.esNitValido()
        ? 'Revise los campos del formulario.'
        : 'NIT inválido. Use CF o 7 u 8 dígitos, un guion y un dígito o K.',
    );
    return false;
  }

  tieneCambiosValidosParaActualizar(): boolean {
    return (
      this.isEditing && this.proveedorOriginalClave !== this.obtenerClaveProveedor(this.proveedor)
    );
  }

  private obtenerClaveProveedor(prov: proveedorRequest): string {
    return [prov.nombre, prov.telefono, prov.email, prov.nit]
      .map((valor) => (valor ?? '').trim())
      .join('|');
  }

  private obtenerDatosProveedor(prov: proveedorRequest): proveedorRequest {
    return { nombre: prov.nombre, nit: prov.nit, telefono: prov.telefono, email: prov.email };
  }

  // ------------ LIMPIAR FORMULARIO ------------
  cancelar(formulario?: NgForm): void {
    if (this.destruido || this.operacionPendiente) return;
    this.limpiarFormulario(formulario);
  }

  private limpiarFormulario(formulario?: NgForm): void {
    this.proveedor = {
      nombre: '',
      nit: '',
      telefono: '',
      email: '',
    };
    this.isEditing = false;
    this.idProveedorActualizar = null;
    this.proveedorOriginalClave = '';
    formulario?.resetForm(this.proveedor);
    this.cdr.markForCheck();
  }
}
