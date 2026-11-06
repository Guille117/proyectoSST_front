import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, timeout } from 'rxjs';
import { ServicioCama } from './data/servicioCama';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { crearSeleccionesPendientes, SeleccionPendiente } from '../../../shared/opcion-otro/crear-seleccion-pendiente';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { tipoDato2 } from '../../Catalogos/data/nombreInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { camaRequest, camaResponseSimple, EstadoCama } from './data/interfazCama';

@Component({
  selector: 'app-camas',
  imports: [CommonModule, FormsModule, OpcionOtroComponent, TabSwitch],
  templateUrl: './camas.html',
  styleUrl: './camas.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Camas implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly servicioCama = inject(ServicioCama);
  private readonly destroyRef = inject(DestroyRef);
EstadoCama = EstadoCama;

  constructor(
    private readonly popUp: PopUps,
  ) {}

  areas: tipoDato2[] = [];
  tiposCama: tipoDato2[] = [];
  habitaciones: tipoDato2[] = [];
  readonly opcionOtroId = -1;
  mostrandoOtroArea = false;
  mostrandoOtroTipoCama = false;
  mostrandoOtroHabitacion = false;
  creandoArea = false;
  creandoTipoCama = false;
  creandoHabitacion = false;
  preparandoSelecciones = false;
  guardando = false;
  private readonly areaOtro = viewChild<OpcionOtroComponent>('areaOtro');
  private readonly tipoCamaOtro = viewChild<OpcionOtroComponent>('tipoCamaOtro');
  private readonly habitacionOtro = viewChild<OpcionOtroComponent>('habitacionOtro');
  private areaAnterior = 0;
  private tipoCamaAnterior = 0;
  private habitacionAnterior = 0;
  mostrarActivos = true;
  filtro = 'codigo';
  busquedaEnfocada = false;
  textoBusqueda = '';
  menuCamaAbierto: number | null = null;

  /** Nombre corto del paciente que ocupa cada cama, indexado por el id de la cama. */
  nombresPacientesPorCama = new Map<number, string>();


  ngOnInit(): void {
    this.cargarCatalogos();
    this.listarCamas();
  }

  private cargarCatalogos(): void {
    this.catalogoService.listar2('areas', true).subscribe((data) => {
      this.areas = data;

      if (!this.camaRequest.areaId && data.length) {
        this.camaRequest.areaId = data[0].id ?? 0;
      }

      this.cdr.detectChanges();
    });

    this.catalogoService.listar2('tiposCama', true).subscribe((data) => {
      this.tiposCama = data;
      this.cdr.detectChanges();
    });

    this.catalogoService.listar2('habitaciones', true).subscribe((data) => {
      this.habitaciones = data;
      this.cdr.detectChanges();
    });
  }

  // -------------------- CREACIÓN DE CATÁLOGOS --------------------
  alElegirArea(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.areaAnterior = this.camaRequest.areaId;
      this.camaRequest.areaId = 0;
      this.mostrandoOtroArea = true;
      return;
    }

    this.camaRequest.areaId = valor;
  }

  async crearArea(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoArea) return false;

    this.creandoArea = true;
    try {
      const creada = await firstValueFrom(
        this.catalogoService
          .crear2('areas', { nombre: datos.nombre })
          .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef)),
      );

      if (creada?.id == null) {
        this.popUp.error('No se pudo crear el área.');
        return false;
      }

      this.areas = [...this.areas, creada];
      this.camaRequest.areaId = creada.id;
      this.mostrandoOtroArea = false;
      return true;
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'No se pudo crear el área.');
      return false;
    } finally {
      this.creandoArea = false;
      this.cdr.detectChanges();
    }
  }

  cancelarArea(): void {
    this.mostrandoOtroArea = false;
    this.camaRequest.areaId = this.areaAnterior;
  }

  alElegirTipoCama(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.tipoCamaAnterior = this.camaRequest.tipoId;
      this.camaRequest.tipoId = 0;
      this.mostrandoOtroTipoCama = true;
      return;
    }

    this.camaRequest.tipoId = valor;
  }

  async crearTipoCama(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoTipoCama) return false;

    this.creandoTipoCama = true;
    try {
      const creado = await firstValueFrom(
        this.catalogoService
          .crear2('tiposCama', { nombre: datos.nombre })
          .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef)),
      );

      if (creado?.id == null) {
        this.popUp.error('No se pudo crear el tipo de cama.');
        return false;
      }

      this.tiposCama = [...this.tiposCama, creado];
      this.camaRequest.tipoId = creado.id;
      this.mostrandoOtroTipoCama = false;
      return true;
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'No se pudo crear el tipo de cama.');
      return false;
    } finally {
      this.creandoTipoCama = false;
      this.cdr.detectChanges();
    }
  }

  cancelarTipoCama(): void {
    this.mostrandoOtroTipoCama = false;
    this.camaRequest.tipoId = this.tipoCamaAnterior;
  }

  alElegirHabitacion(valor: number): void {
    if (valor === this.opcionOtroId) {
      this.habitacionAnterior = this.camaRequest.habitacionId;
      this.camaRequest.habitacionId = 0;
      this.mostrandoOtroHabitacion = true;
      return;
    }

    this.camaRequest.habitacionId = valor;
  }

  async crearHabitacion(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoHabitacion) return false;

    this.creandoHabitacion = true;
    try {
      const creada = await firstValueFrom(
        this.catalogoService
          .crear2('habitaciones', { nombre: datos.nombre })
          .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef)),
      );

      if (creada?.id == null) {
        this.popUp.error('No se pudo crear la habitación.');
        return false;
      }

      this.habitaciones = [...this.habitaciones, creada];
      this.camaRequest.habitacionId = creada.id;
      this.mostrandoOtroHabitacion = false;
      return true;
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'No se pudo crear la habitación.');
      return false;
    } finally {
      this.creandoHabitacion = false;
      this.cdr.detectChanges();
    }
  }

  cancelarHabitacion(): void {
    this.mostrandoOtroHabitacion = false;
    this.camaRequest.habitacionId = this.habitacionAnterior;
  }

  private resolverSeleccionesPendientes(): Promise<boolean> {
    const selecciones: SeleccionPendiente[] = [];

    if (this.mostrandoOtroArea) {
      selecciones.push({
        etiqueta: 'Área',
        componente: () => this.areaOtro(),
        crear: (datos) => this.crearArea(datos),
      });
    }

    if (this.mostrandoOtroTipoCama) {
      selecciones.push({
        etiqueta: 'Tipo de cama',
        componente: () => this.tipoCamaOtro(),
        crear: (datos) => this.crearTipoCama(datos),
      });
    }

    if (this.mostrandoOtroHabitacion) {
      selecciones.push({
        etiqueta: 'Habitación',
        componente: () => this.habitacionOtro(),
        crear: (datos) => this.crearHabitacion(datos),
      });
    }

    return crearSeleccionesPendientes(selecciones, (mensaje) =>
      this.popUp.formIncompleto(mensaje),
    );
  }

  //---------------------------------------------------
  // registrar camas
    camaRequest: camaRequest = {
    habitacionId: 0,
    tipoId: 0,
    areaId: 0,
  };
    precio: number | null = 0;
    private camaRequestInicial: camaRequest | null = null;

  validarCama(): boolean {
    const areaValida = !!this.camaRequest.areaId || this.mostrandoOtroArea;
    const tipoValido = !!this.camaRequest.tipoId || this.mostrandoOtroTipoCama;
    const habitacionValida = !!this.camaRequest.habitacionId || this.mostrandoOtroHabitacion;

    if (!areaValida || !tipoValido || !habitacionValida) {
      this.popUp.formIncompleto('Debe seleccionar área, tipo de cama y habitación.');
      return false;
    }

    if (!this.camaRequest.areaId && this.areas.length) {
      this.camaRequest.areaId = this.areas[0].id ?? 0;
    }

    return true;
  }

  async crearCama(): Promise<void> {
    if (this.guardando || this.preparandoSelecciones || !this.validarCama()) {
      return;
    }

    this.preparandoSelecciones = true;
    this.cdr.detectChanges();
    try {
      if (!(await this.resolverSeleccionesPendientes())) {
        return;
      }
    } finally {
      this.preparandoSelecciones = false;
      this.cdr.detectChanges();
    }

    this.guardando = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(
        this.servicioCama
          .crearCama({ ...this.camaRequest, precio: this.precio })
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.popUp.exito('Cama creada exitosamente');
      this.limpiarFormulario();
      this.listarCamas();
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'Error al crear la cama');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }


  //---------------------------------------------------

  // swtich de activos e inactivos
  cambiarEstado(activos: boolean): void {
    this.mostrarActivos = activos;
    this.filtro = 'codigo';
    this.textoBusqueda = '';
    this.busquedaEnfocada = false;
    this.listarCamas();
  }

  cambiarFiltro(): void {
    this.textoBusqueda = '';
    this.busquedaEnfocada = false;
  }

  //---------------------------------------
  // listar camas
  camas: camaResponseSimple[] = [];
  readonly camasPorPagina = 8;
  paginaCamas = 1;

  get totalPaginasCamas(): number {
    return Math.max(1, Math.ceil(this.camas.length / this.camasPorPagina));
  }

  get camasPaginadas(): camaResponseSimple[] {
    const inicio = (this.paginaCamas - 1) * this.camasPorPagina;
    return this.camas.slice(inicio, inicio + this.camasPorPagina);
  }

  listarCamas(){
    this.servicioCama.listarCamas(this.mostrarActivos).subscribe({
      next: (data) => {
        this.camas = data;
        this.paginaCamas = 1;
        this.cargarPacientesOcupados();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al listar las camas');
      }
    })
  }

  /** Carga el nombre corto de los pacientes que ocupan camas y lo indexa por cama. */
  private cargarPacientesOcupados(): void {
    this.servicioCama.listarCamasOcupadas().subscribe({
      next: (camas) => {
        this.nombresPacientesPorCama = new Map(
          camas.map((cama) => [cama.idCama, this.formatearNombrePaciente(cama.nombrePaciente)]),
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.nombresPacientesPorCama = new Map();
      },
    });
  }

  /** Nombre corto de la cama ocupada: primer nombre y primer apellido. */
  nombrePacienteCama(cama: camaResponseSimple): string {
    return this.nombresPacientesPorCama.get(cama.idCama) ?? '';
  }

  /** Precio por día registrado en la cama; muestra un guion cuando aún no tiene precio. */
  precioPorDia(cama: camaResponseSimple): string {
    if (cama.precio == null) {
      return '—';
    }

    return `Q ${Number(cama.precio).toFixed(2)}`;
  }

  /** Reduce el nombre completo al primer nombre y al primer apellido. */
  private formatearNombrePaciente(nombreCompleto: string): string {
    const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);

    if (partes.length <= 2) {
      return partes.join(' ');
    }

    return `${partes[0]} ${partes[partes.length - 2]}`;
  }
   //---------------------------------------

   //---------------------------------------
  // cambiar estado de cama
  cambiarEstadoCama(camaId: number, estado: EstadoCama){
    this.servicioCama.cambiarEstadoCama(camaId, estado).subscribe({
      next: () => {
        this.popUp.exito('Estado de cama actualizado exitosamente');
        this.listarCamas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al cambiar el estado de la cama');
      }
    });
  }

  alternarMenuCama(camaId: number): void {
    this.menuCamaAbierto = this.menuCamaAbierto === camaId ? null : camaId;
  }

  cerrarMenuCama(): void {
    this.menuCamaAbierto = null;
  }

  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuCamaAbierto === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.cama-card');
    if (tarjeta?.dataset['camaId'] !== String(this.menuCamaAbierto)) {
      this.cerrarMenuCama();
    }
  }

  async cambiarActivoCama(camaId: number): Promise<void> {
    const confirmacion = await this.popUp.confirmarToast('¿Estás seguro de cambiar el estado de la cama?');
    if (!confirmacion) {
      return;
    }

    this.servicioCama.cambiarActivoCama(camaId).subscribe({
      next: () => {
        this.listarCamas();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al cambiar el estado de la cama');
      }
    });
  }
   
  //---------------------------------------
  //---------------------------------------
  // editar información de cama
  isEditing: boolean = false;
  idActualizar: number | null = null;
  precargarCama(id:number){
    this.servicioCama.traerReferencias(id).subscribe({
      next: (data) => {
        this.camaRequest = data;
        this.camaRequestInicial = { ...data };
        this.precio = data.precio ?? 0;
        this.isEditing = true;
        this.idActualizar = id;
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al actualizar datos de cama');
      }
    })
  }

  async actualizarCama(){
    if (
      this.guardando ||
      this.preparandoSelecciones ||
      this.idActualizar == null ||
      !this.validarCama()
    ) {
      return;
    }

    const confirmacion = await this.popUp.confirmarToast('¿Estás seguro de actualizar la cama?');
    if (!confirmacion) {
      return;
    }

    const id = this.idActualizar;
    this.preparandoSelecciones = true;
    this.cdr.detectChanges();
    try {
      if (!(await this.resolverSeleccionesPendientes())) {
        return;
      }
    } finally {
      this.preparandoSelecciones = false;
      this.cdr.detectChanges();
    }

    const datosCama = {
      ...this.camaRequest,
      precio: this.precio,
    };

    this.guardando = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(
        this.servicioCama
          .actualizarCama(id, datosCama)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.popUp.exito('Cama actualizada exitosamente');
      this.limpiarFormulario();
      this.listarCamas();
      this.isEditing = false;
    } catch (error) {
      this.popUp.errorDesdeBackend(error, 'Error al actualizar la cama');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  //---------------------------------------
    
  //---------------------------------------
  // buscar camas
  buscarCamas(texto: string){
    this.servicioCama.buscarCamas(texto, this.mostrarActivos).subscribe({
      next: (data) => {
        this.camas = data;
        this.paginaCamas = 1;
        console.log('Camas encontradas:', data);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPaginaCamas(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginasCamas) {
      return;
    }

    this.paginaCamas = pagina;
    this.cerrarMenuCama();
  }

  //---------------------------------------

  
  limpiarFormulario(): void {
    this.camaRequest = {
      habitacionId: 0,
      tipoId: 0,
      areaId: this.areas[0]?.id ?? 0,
    };
    this.precio = 0;
    this.camaRequestInicial = null;
    this.isEditing = false;
  }

  puedeGuardar(): boolean {
    const formularioCompleto = Boolean(
      (this.camaRequest.areaId || this.mostrandoOtroArea) &&
      (this.camaRequest.tipoId || this.mostrandoOtroTipoCama) &&
      (this.camaRequest.habitacionId || this.mostrandoOtroHabitacion),
    );

    if (!formularioCompleto) {
      return false;
    }

    if (!this.camaRequestInicial) {
      return true;
    }

    const precioInicial = Number(this.camaRequestInicial.precio ?? 0);
    const precioActual = Number(this.precio ?? 0);

    return (
      this.camaRequest.tipoId !== this.camaRequestInicial.tipoId ||
      this.camaRequest.habitacionId !== this.camaRequestInicial.habitacionId ||
      this.camaRequest.areaId !== this.camaRequestInicial.areaId ||
      precioActual !== precioInicial
    );
  }
}
