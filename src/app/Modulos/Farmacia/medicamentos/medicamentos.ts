import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, firstValueFrom, forkJoin } from 'rxjs';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base, Inter_unidadMedida } from '../../Catalogos/data/nombreInterfaz';
import { MedicamentoLogFiltros, MedicamentoLogRequest, MedicamentoLogResponse } from './data/interfaz-medicamento';
import { ServicioMedicamento } from './data/servicio-medicamento';

@Component({
  selector: 'app-medicamentos',
  imports: [FormsModule, CampoValidado, TabSwitch, Paginacion, SlicePipe],
  templateUrl: './medicamentos.html',
  styleUrl: './medicamentos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Medicamentos implements OnInit {
  // ==================== INYECCIONES ====================
  private readonly servicioMedicamento = inject(ServicioMedicamento);
  private readonly servicioCatalogos = inject(CatalogoService);
  private readonly popUp = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.llenarSelects();
    this.listarMedicamentos();
  }

  // ==================== LLENADO DE SELECTS ====================
  unidadesMedida: Inter_unidadMedida[] = [];
  fabricantes: Inter_base[] = [];
  presentaciones: Inter_base[] = [];
  viasAdmin: Inter_base[] = [];

  llenarSelects(): void {
    forkJoin({
      unidades: this.servicioCatalogos.listar<Inter_unidadMedida>('unidadMedida'),
      fabricantes: this.servicioCatalogos.listar<Inter_base>('marca'),
      presentaciones: this.servicioCatalogos.listar<Inter_base>('presentacion'),
      vias: this.servicioCatalogos.listar<Inter_base>('viaAdmin'),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.unidadesMedida = res.unidades;
          this.fabricantes = res.fabricantes;
          this.presentaciones = res.presentaciones;
          this.viasAdmin = res.vias;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.popUp.errorDesdeBackend(err, 'Error al cargar los catálogos.');
        },
      });
  }

  // ==================== GUARDAR ====================
  medicamento = this.crearMedicamentoVacio();
  procesando = false;

  async guardarMedicamento(formulario?: NgForm): Promise<void> {
    if (this.procesando || !this.formularioValido(formulario)) return;

    this.procesando = true;
    this.cdr.markForCheck();
    try {
      await firstValueFrom(
        this.servicioMedicamento
          .crearMedicamentoLog({ ...this.medicamento })
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.popUp.exito('Detalle de medicamento registrado exitosamente.');
      this.limpiarFormulario(formulario);
      this.listarMedicamentos();
    } catch (err) {
      this.popUp.errorDesdeBackend(err, 'Error al registrar el detalle de medicamento.');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ==================== LISTAR ====================
  mostrarActivos = true;
  medicamentos: MedicamentoLogResponse[] = [];
  paginaActual = 1;
  readonly cantidadMostrar = 5;

  cambiarFiltroActivo(activo: boolean, formulario?: NgForm): void {
    if (this.mostrarActivos === activo) return;

    this.mostrarActivos = activo;
    this.paginaActual = 1;
    this.filtrosAplicados = { ...this.filtrosAplicados, activo };
    if (this.actualizar) {
      this.limpiarEdicion();
      this.limpiarFormulario(formulario);
    }
    this.listarMedicamentos();
  }

  listarMedicamentos(): void {
    const solicitud = this.busquedaAplicada
      ? this.servicioMedicamento.buscarMedicamentoLog({ ...this.filtrosAplicados })
      : this.servicioMedicamento.traerMedicamentoLog(this.mostrarActivos);

    solicitud
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.medicamentos = res;
          this.paginaActual = Math.min(
            this.paginaActual,
            Math.max(1, Math.ceil(res.length / this.cantidadMostrar)),
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          const mensaje = this.busquedaAplicada
            ? 'Error al buscar los medicamentos.'
            : 'Error al cargar los medicamentos.';
          this.popUp.errorDesdeBackend(err, mensaje);
        },
      });
  }

  // ==================== BUSCAR ====================
  criterioBusqueda = 'nombre';
  textoBusqueda = '';
  valorBusquedaCatalogo = '';
  private busquedaAplicada = false;
  private filtrosAplicados: MedicamentoLogFiltros = { activo: true };

  get opcionesBusqueda(): Inter_base[] {
    switch (this.criterioBusqueda) {
      case 'fabricante':
        return this.fabricantes;
      case 'presentacion':
        return this.presentaciones;
      case 'viaAdministracion':
        return this.viasAdmin;
      default:
        return [];
    }
  }

  cambiarCriterioBusqueda(criterio: string): void {
    this.criterioBusqueda = criterio;
    this.textoBusqueda = '';
    this.valorBusquedaCatalogo = '';
  }

  buscarMedicamentos(): void {
    const filtros: MedicamentoLogFiltros = { activo: this.mostrarActivos };
    if (this.criterioBusqueda === 'nombre') {
      const nombre = this.textoBusqueda.trim();
      if (nombre) filtros.nombre = nombre;
    } else if (this.valorBusquedaCatalogo !== '') {
      const id = Number(this.valorBusquedaCatalogo);
      if (Number.isInteger(id) && id > 0) {
        switch (this.criterioBusqueda) {
          case 'fabricante':
            filtros.marcaId = id;
            break;
          case 'presentacion':
            filtros.presentacionId = id;
            break;
          case 'viaAdministracion':
            filtros.viaAdminId = id;
            break;
        }
      }
    }

    this.filtrosAplicados = filtros;
    this.busquedaAplicada = true;
    this.paginaActual = 1;
    this.listarMedicamentos();
  }

  // ==================== ACTUALIZAR ====================
  actualizar = false;
  idActualizar: number | null = null;
  private medicamentoOriginal: MedicamentoLogRequest | null = null;

  preactualizar(id: number): void {
    if (!this.mostrarActivos || this.actualizar || this.procesando) return;

    this.actualizar = true;
    this.idActualizar = id;
    this.servicioMedicamento
      .buscarMedLogActualizar(id, this.mostrarActivos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!this.actualizar || this.idActualizar !== id) return;
          this.medicamentoOriginal = { ...res };
          this.medicamento = { ...res };
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.actualizar || this.idActualizar !== id) return;
          this.limpiarEdicion();
          this.limpiarFormulario();
          this.popUp.errorDesdeBackend(err, 'Error al buscar el medicamento.');
          this.cdr.markForCheck();
        },
      });
  }

  async actualizarMedicamento(formulario?: NgForm): Promise<void> {
    if (
      this.procesando ||
      !this.mostrarActivos ||
      !this.actualizar ||
      !this.formularioValido(formulario) ||
      !this.hayCambiosMedicamento() ||
      this.idActualizar === null
    ) {
      return;
    }

    const id = this.idActualizar;
    const medicamento = { ...this.medicamento };
    this.procesando = true;
    this.cdr.markForCheck();
    let solicitudIniciada = false;
    try {
      const confirmado = await this.popUp.confirmarToast(
        '¿Está seguro de actualizar el detalle del medicamento?',
      );
      if (!confirmado || !this.actualizar || this.idActualizar !== id || !this.mostrarActivos) {
        return;
      }

      solicitudIniciada = true;
      this.servicioMedicamento
        .actualizarMedicamentoLog(id, medicamento)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.procesando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.popUp.exito('Detalle de medicamento actualizado exitosamente.');
            this.limpiarEdicion();
            this.limpiarFormulario(formulario);
            this.listarMedicamentos();
          },
          error: (err) => {
            this.popUp.errorDesdeBackend(err, 'Error al actualizar el detalle de medicamento.');
          },
        });
    } catch (err) {
      this.popUp.errorDesdeBackend(err, 'Error al actualizar el detalle de medicamento.');
    } finally {
      if (!solicitudIniciada) {
        this.procesando = false;
        this.cdr.markForCheck();
      }
    }
  }

  cancelar(formulario: NgForm): void {
    this.limpiarEdicion();
    this.limpiarFormulario(formulario);
  }

  hayCambiosMedicamento(): boolean {
    return this.medicamentoOriginal !== null
      && this.medicamentoTieneCambios(this.medicamentoOriginal, this.medicamento);
  }

  private medicamentoTieneCambios(
    original: MedicamentoLogRequest,
    actualizado: MedicamentoLogRequest,
  ): boolean {
    return original.nombre.trim() !== actualizado.nombre.trim()
      || original.dosis !== actualizado.dosis
      || original.unidadMedidaId !== actualizado.unidadMedidaId
      || original.marcaId !== actualizado.marcaId
      || original.presentacionId !== actualizado.presentacionId
      || original.viaAdminId !== actualizado.viaAdminId;
  }

  // ==================== CAMBIAR ESTADO ====================
  manejarCambioEstado(medicamento: MedicamentoLogResponse, evento: Event): void {
    (evento.target as HTMLInputElement).checked = medicamento.estado;
    void this.cambiarEstadoMed(medicamento.id);
  }

  async cambiarEstadoMed(id: number): Promise<void> {
    if (this.actualizar || this.procesando) return;

    const medicamento = this.medicamentos.find((item) => item.id === id);
    if (!medicamento) return;

    this.procesando = true;
    this.cdr.markForCheck();
    let solicitudIniciada = false;
    try {
      const confirmado = await this.popUp.confirmarToast(
        '¿Está seguro de cambiar el estado del medicamento?',
      );
      if (!confirmado || this.actualizar) return;

      solicitudIniciada = true;
      this.servicioMedicamento
        .cambiarEstadoMedicamento(id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.procesando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            medicamento.estado = !medicamento.estado;
            this.popUp.exito('Estado del medicamento cambiado exitosamente.');
            this.listarMedicamentos();
          },
          error: (err) => {
            this.popUp.errorDesdeBackend(err, 'Error al cambiar el estado del medicamento.');
          },
        });
    } catch (err) {
      this.popUp.errorDesdeBackend(err, 'Error al cambiar el estado del medicamento.');
    } finally {
      if (!solicitudIniciada) {
        this.procesando = false;
        this.cdr.markForCheck();
      }
    }
  }

  // ==================== HELPERS ====================
  private crearMedicamentoVacio(): MedicamentoLogRequest {
    return {
      nombre: '',
      dosis: 0,
      unidadMedidaId: 0,
      marcaId: 0,
      presentacionId: 0,
      viaAdminId: 0,
    };
  }

  private limpiarFormulario(formulario?: NgForm): void {
    this.medicamento = this.crearMedicamentoVacio();
    formulario?.resetForm(this.medicamento);
  }

  private limpiarEdicion(): void {
    this.actualizar = false;
    this.idActualizar = null;
    this.medicamentoOriginal = null;
  }

  formularioValido(formulario?: NgForm): boolean {
    return (!formulario || !formulario.invalid)
      && this.medicamento.nombre.trim().length > 0
      && this.medicamento.dosis > 0
      && this.medicamento.unidadMedidaId > 0
      && this.medicamento.marcaId > 0
      && this.medicamento.presentacionId > 0
      && this.medicamento.viaAdminId > 0;
  }
}
