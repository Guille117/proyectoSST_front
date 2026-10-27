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
import { finalize, firstValueFrom, forkJoin, timeout } from 'rxjs';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base, Inter_unidadMedida } from '../../Catalogos/data/nombreInterfaz';
import { MedicamentoLogFiltros, MedicamentoLogRequest, MedicamentoLogResponse } from './data/interfaz-medicamento';
import { ServicioMedicamento } from './data/servicio-medicamento';

@Component({
  selector: 'app-medicamentos',
  imports: [FormsModule, CampoValidado, OpcionOtroComponent, TabSwitch, Paginacion, SlicePipe],
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

  readonly opcionOtroId = -1;
  mostrandoOtroUnidad = false;
  mostrandoOtroVia = false;
  mostrandoOtroPresentacion = false;
  mostrandoOtroMarca = false;
  creandoUnidad = false;
  creandoVia = false;
  creandoPresentacion = false;
  creandoMarca = false;
  private unidadAnterior = 0;
  private viaAnterior = 0;
  private presentacionAnterior = 0;
  private marcaAnterior = 0;

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

  // ==================== CREACIÓN DE CATÁLOGOS ====================
  alElegirUnidad(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.unidadAnterior = this.medicamento.unidadMedidaId;
      this.medicamento.unidadMedidaId = 0;
      this.mostrandoOtroUnidad = true;
      return;
    }

    this.medicamento.unidadMedidaId = valor;
  }

  crearUnidad(datos: OpcionOtroValor): void {
    if (this.creandoUnidad || !datos.abreviatura) return;

    this.creandoUnidad = true;
    this.servicioCatalogos
      .guardarUnidadMedida(datos.nombre, datos.abreviatura)
      .pipe(
        timeout(5000),
        finalize(() => {
          this.creandoUnidad = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creada) => {
          const unidad: Inter_unidadMedida = {
            id: creada.id,
            nombre: creada.nombre,
            abreviatura: creada.abreviatura ?? datos.abreviatura ?? '',
          };

          this.unidadesMedida = [...this.unidadesMedida, unidad];
          this.medicamento.unidadMedidaId = creada.id;
          this.mostrandoOtroUnidad = false;
          this.cdr.markForCheck();
        },
        error: (error) => this.popUp.errorDesdeBackend(error, 'No se pudo crear la unidad de medida.'),
      });
  }

  cancelarUnidad(): void {
    this.mostrandoOtroUnidad = false;
    this.medicamento.unidadMedidaId = this.unidadAnterior;
  }

  alElegirVia(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.viaAnterior = this.medicamento.viaAdminId;
      this.medicamento.viaAdminId = 0;
      this.mostrandoOtroVia = true;
      return;
    }

    this.medicamento.viaAdminId = valor;
  }

  crearVia(datos: OpcionOtroValor): void {
    if (this.creandoVia) return;

    this.creandoVia = true;
    this.servicioCatalogos
      .crear<Inter_base>('viaAdmin', { nombre: datos.nombre })
      .pipe(
        timeout(5000),
        finalize(() => {
          this.creandoVia = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creada) => {
          if (creada.id == null) return;

          this.viasAdmin = [...this.viasAdmin, creada];
          this.medicamento.viaAdminId = creada.id;
          this.mostrandoOtroVia = false;
          this.cdr.markForCheck();
        },
        error: (error) =>
          this.popUp.errorDesdeBackend(error, 'No se pudo crear la vía de administración.'),
      });
  }

  cancelarVia(): void {
    this.mostrandoOtroVia = false;
    this.medicamento.viaAdminId = this.viaAnterior;
  }

  alElegirPresentacion(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.presentacionAnterior = this.medicamento.presentacionId;
      this.medicamento.presentacionId = 0;
      this.mostrandoOtroPresentacion = true;
      return;
    }

    this.medicamento.presentacionId = valor;
  }

  crearPresentacion(datos: OpcionOtroValor): void {
    if (this.creandoPresentacion) return;

    this.creandoPresentacion = true;
    this.servicioCatalogos
      .crear<Inter_base>('presentacion', { nombre: datos.nombre })
      .pipe(
        timeout(5000),
        finalize(() => {
          this.creandoPresentacion = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creada) => {
          if (creada.id == null) return;

          this.presentaciones = [...this.presentaciones, creada];
          this.medicamento.presentacionId = creada.id;
          this.mostrandoOtroPresentacion = false;
          this.cdr.markForCheck();
        },
        error: (error) => this.popUp.errorDesdeBackend(error, 'No se pudo crear la presentación.'),
      });
  }

  cancelarPresentacion(): void {
    this.mostrandoOtroPresentacion = false;
    this.medicamento.presentacionId = this.presentacionAnterior;
  }

  alElegirMarca(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.marcaAnterior = this.medicamento.marcaId;
      this.medicamento.marcaId = 0;
      this.mostrandoOtroMarca = true;
      return;
    }

    this.medicamento.marcaId = valor;
  }

  crearMarca(datos: OpcionOtroValor): void {
    if (this.creandoMarca) return;

    this.creandoMarca = true;
    this.servicioCatalogos
      .crear<Inter_base>('marca', { nombre: datos.nombre })
      .pipe(
        timeout(5000),
        finalize(() => {
          this.creandoMarca = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creada) => {
          if (creada.id == null) return;

          this.fabricantes = [...this.fabricantes, creada];
          this.medicamento.marcaId = creada.id;
          this.mostrandoOtroMarca = false;
          this.cdr.markForCheck();
        },
        error: (error) => this.popUp.errorDesdeBackend(error, 'No se pudo crear el fabricante.'),
      });
  }

  cancelarMarca(): void {
    this.mostrandoOtroMarca = false;
    this.medicamento.marcaId = this.marcaAnterior;
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
