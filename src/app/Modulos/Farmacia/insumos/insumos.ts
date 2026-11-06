import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, firstValueFrom, timeout } from 'rxjs';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { crearSeleccionesPendientes } from '../../../shared/opcion-otro/crear-seleccion-pendiente';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { Insumo, InsumoRequest, InsumoResponse } from './data/interfazInsumo';
import { ServicioInsumos } from './data/servicio-insumos';

@Component({
  selector: 'app-insumos',
  imports: [FormsModule, CampoValidado, OpcionOtroComponent, TabSwitch, Paginacion, SlicePipe],
  templateUrl: './insumos.html',
  styleUrl: './insumos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Insumos implements OnInit {
  // ==================== INYECCIONES ====================
  private readonly servicioInsumos = inject(ServicioInsumos);
  private readonly servicioCatalogos = inject(CatalogoService);
  private readonly popUp = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.llenarSelects();
    this.listarInsumos();
  }

  // ==================== LLENADO DE SELECTS ====================
  fabricantes: Inter_base[] = [];

  readonly opcionOtroId = -1;
  mostrandoOtroMarca = false;
  creandoMarca = false;
  preparandoSelecciones = false;
  private marcaAnterior = 0;
  private readonly marcaOtro = viewChild<OpcionOtroComponent>('marcaOtro');

  private llenarSelects(): void {
    this.servicioCatalogos
      .listar<Inter_base>('marca')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fabricantes) => {
          this.fabricantes = fabricantes;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.popUp.errorDesdeBackend(err, 'Error al cargar los fabricantes.');
        },
      });
  }

  // ==================== CREACIÓN DE CATÁLOGOS ====================
  alElegirMarca(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.marcaAnterior = this.insumo.marcaId;
      this.insumo.marcaId = 0;
      this.mostrandoOtroMarca = true;
      return;
    }

    this.insumo.marcaId = valor;
  }

  async crearMarca(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoMarca) return false;

    this.creandoMarca = true;
    try {
      const creada = await firstValueFrom(
        this.servicioCatalogos
          .crear<Inter_base>('marca', { nombre: datos.nombre })
          .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef)),
      );

      if (creada.id == null) {
        this.popUp.error('No se pudo crear el fabricante.');
        return false;
      }

      this.fabricantes = [...this.fabricantes, creada];
      this.insumo.marcaId = creada.id;
      this.mostrandoOtroMarca = false;
      return true;
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'No se pudo crear el fabricante.');
      return false;
    } finally {
      this.creandoMarca = false;
      this.cdr.markForCheck();
    }
  }

  cancelarMarca(): void {
    this.mostrandoOtroMarca = false;
    this.insumo.marcaId = this.marcaAnterior;
  }

  private resolverMarcaPendiente(): Promise<boolean> {
    if (!this.mostrandoOtroMarca) {
      return Promise.resolve(true);
    }

    return crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Fabricante',
          componente: this.marcaOtro,
          crear: (datos) => this.crearMarca(datos),
        },
      ],
      (mensaje) => this.popUp.formIncompleto(mensaje),
    );
  }

  // ==================== GUARDAR ====================
  insumo = this.crearInsumoVacio();
  procesando = false;

  async guardarInsumo(formulario?: NgForm): Promise<void> {
    if (this.procesando || this.preparandoSelecciones || !this.formularioValido(formulario)) {
      return;
    }

    this.preparandoSelecciones = true;
    this.cdr.markForCheck();
    try {
      if (!(await this.resolverMarcaPendiente())) {
        return;
      }
    } finally {
      this.preparandoSelecciones = false;
      this.cdr.markForCheck();
    }

    this.procesando = true;
    this.cdr.markForCheck();
    try {
      await firstValueFrom(
        this.servicioInsumos
          .crearInsumo({ ...this.insumo })
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.popUp.exito('Insumo registrado exitosamente.');
      this.limpiarFormulario(formulario);
      this.listarInsumos();
    } catch (err) {
      this.popUp.errorDesdeBackend(err, 'Error al registrar el insumo.');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ==================== LISTAR ====================
  mostrarActivos = true;
  insumos: Insumo[] = [];
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
    this.listarInsumos();
  }

  private listarInsumos(): void {
    const solicitud = this.busquedaAplicada
      ? this.servicioInsumos.buscarInsumos({ ...this.filtrosAplicados })
      : this.servicioInsumos.listarInsumos(this.mostrarActivos);

    solicitud
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (insumos) => {
          this.insumos = insumos;
          this.paginaActual = Math.min(
            this.paginaActual,
            Math.max(1, Math.ceil(insumos.length / this.cantidadMostrar)),
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          const mensaje = this.busquedaAplicada
            ? 'Error al buscar los insumos.'
            : 'Error al cargar los insumos.';
          this.popUp.errorDesdeBackend(err, mensaje);
        },
      });
  }

  // ==================== BUSCAR ====================
  criterioBusqueda = 'nombre';
  textoBusqueda = '';
  valorBusquedaMarca = '';
  private busquedaAplicada = false;
  private filtrosAplicados: { nombre?: string; marcaId?: number; activo?: boolean } = {
    activo: true,
  };

  get opcionesBusqueda(): Inter_base[] {
    return this.criterioBusqueda === 'fabricante' ? this.fabricantes : [];
  }

  cambiarCriterioBusqueda(criterio: string): void {
    this.criterioBusqueda = criterio;
    this.textoBusqueda = '';
    this.valorBusquedaMarca = '';
  }

  buscarInsumos(): void {
    const filtros: { nombre?: string; marcaId?: number; activo?: boolean } = {
      activo: this.mostrarActivos,
    };
    if (this.criterioBusqueda === 'nombre') {
      const nombre = this.textoBusqueda.trim();
      if (nombre) filtros.nombre = nombre;
    } else if (this.valorBusquedaMarca !== '') {
      const marcaId = Number(this.valorBusquedaMarca);
      if (Number.isInteger(marcaId) && marcaId > 0) filtros.marcaId = marcaId;
    }

    this.filtrosAplicados = filtros;
    this.busquedaAplicada = true;
    this.paginaActual = 1;
    this.listarInsumos();
  }

  // ==================== ACTUALIZAR ====================
  actualizar = false;
  idActualizar: number | null = null;
  private insumoOriginal: InsumoRequest | null = null;

  preactualizar(id: number): void {
    if (!this.mostrarActivos || this.actualizar || this.procesando) return;

    this.actualizar = true;
    this.idActualizar = id;
    this.servicioInsumos
      .obtenerInsumoPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta: InsumoResponse) => {
          if (!this.actualizar || this.idActualizar !== id) return;
          this.insumoOriginal = {
            nombre: respuesta.nombre,
            marcaId: respuesta.marcaId,
            detalle: respuesta.detalle ?? '',
          };
          this.insumo = { ...this.insumoOriginal };
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.actualizar || this.idActualizar !== id) return;
          this.limpiarEdicion();
          this.limpiarFormulario();
          this.popUp.errorDesdeBackend(err, 'Error al buscar el insumo.');
          this.cdr.markForCheck();
        },
      });
  }

  async actualizarInsumo(formulario?: NgForm): Promise<void> {
    if (
      this.procesando ||
      this.preparandoSelecciones ||
      !this.mostrarActivos ||
      !this.actualizar ||
      !this.formularioValido(formulario) ||
      !this.hayCambiosInsumo() ||
      this.idActualizar === null
    ) {
      return;
    }

    const id = this.idActualizar;
    this.procesando = true;
    this.cdr.markForCheck();
    let solicitudIniciada = false;
    try {
      const confirmado = await this.popUp.confirmarToast(
        '¿Está seguro de actualizar el insumo?',
      );
      if (!confirmado || !this.actualizar || this.idActualizar !== id || !this.mostrarActivos) {
        return;
      }

      this.preparandoSelecciones = true;
      let listo = false;
      try {
        listo = await this.resolverMarcaPendiente();
      } finally {
        this.preparandoSelecciones = false;
        this.cdr.markForCheck();
      }
      if (!listo) return;

      const insumo = { ...this.insumo };
      solicitudIniciada = true;
      this.servicioInsumos
        .actualizarInsumo(id, insumo)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.procesando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.popUp.exito('Insumo actualizado exitosamente.');
            this.limpiarEdicion();
            this.limpiarFormulario(formulario);
            this.listarInsumos();
          },
          error: (err) => {
            this.popUp.errorDesdeBackend(err, 'Error al actualizar el insumo.');
          },
        });
    } catch (err) {
      this.popUp.errorDesdeBackend(err, 'Error al actualizar el insumo.');
    } finally {
      this.preparandoSelecciones = false;
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

  hayCambiosInsumo(): boolean {
    return this.insumoOriginal !== null
      && this.insumoTieneCambios(this.insumoOriginal, this.insumo);
  }

  private insumoTieneCambios(original: InsumoRequest, actualizado: InsumoRequest): boolean {
    return original.nombre.trim() !== actualizado.nombre.trim()
      || original.marcaId !== actualizado.marcaId
      || (original.detalle ?? '').trim() !== (actualizado.detalle ?? '').trim();
  }

  // ==================== CAMBIAR ESTADO ====================
  async cambiarEstadoInsumo(insumo: Insumo, evento: Event): Promise<void> {
    const control = evento.target;
    if (!(control instanceof HTMLInputElement)) return;

    const estadoOriginal = insumo.estado;
    control.checked = estadoOriginal;
    if (this.actualizar || this.procesando) return;

    this.procesando = true;
    this.cdr.markForCheck();
    let solicitudIniciada = false;
    try {
      const confirmado = await this.popUp.confirmarToast(
        '¿Está seguro de cambiar el estado del insumo?',
      );
      if (!confirmado || this.actualizar) return;

      solicitudIniciada = true;
      this.servicioInsumos
        .cambiarEstadoInsumo(insumo.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.procesando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            insumo.estado = !estadoOriginal;
            this.popUp.exito('Estado del insumo cambiado exitosamente.');
            this.listarInsumos();
          },
          error: (err) => {
            control.checked = estadoOriginal;
            this.popUp.errorDesdeBackend(err, 'Error al cambiar el estado del insumo.');
          },
        });
    } catch (err) {
      control.checked = estadoOriginal;
      this.popUp.errorDesdeBackend(err, 'Error al cambiar el estado del insumo.');
    } finally {
      if (!solicitudIniciada) {
        this.procesando = false;
        this.cdr.markForCheck();
      }
    }
  }

  // ==================== HELPERS ====================
  resumirTexto(texto: string | null | undefined, maxCaracteres = 34): string {
    const limpio = texto?.trim();
    if (!limpio) return '—';
    if (limpio.length <= maxCaracteres) return limpio;

    const recorte = limpio.slice(0, maxCaracteres).trimEnd();
    const ultimoEspacio = recorte.lastIndexOf(' ');
    const base = ultimoEspacio > 0 ? recorte.slice(0, ultimoEspacio) : recorte;

    return `${base}...`;
  }

  esTextoTruncado(texto: string | null | undefined, maxCaracteres = 34): boolean {
    const limpio = texto?.trim();
    return !!limpio && limpio.length > maxCaracteres;
  }

  private crearInsumoVacio(): InsumoRequest {
    return {
      nombre: '',
      marcaId: 0,
      detalle: '',
    };
  }

  private limpiarFormulario(formulario?: NgForm): void {
    this.insumo = this.crearInsumoVacio();
    formulario?.resetForm(this.insumo);
  }

  private limpiarEdicion(): void {
    this.actualizar = false;
    this.idActualizar = null;
    this.insumoOriginal = null;
  }

  formularioValido(formulario?: NgForm): boolean {
    return (!formulario || !formulario.invalid)
      && this.insumo.nombre.trim().length > 0
      && (this.insumo.marcaId > 0 || this.mostrandoOtroMarca);
  }
}