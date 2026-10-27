import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, TimeoutError } from 'rxjs';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { AuthService } from '../../Auth/data/auth-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { ProcedimientoMedicoService } from './data/procedimiento-medico-service';
import {
  EstadoProcedimientoApi,
  ProcedimientoMedicoRequest,
  ProcedimientoMedicoResponse,
  TipoRecursoProcedimientoApi,
} from './data/procedimientoMedicoInterfaz';

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de las tarjetas. */
type SeccionProcedimiento = 'registrar' | 'realizados';
type FiltroProcedimiento = 'todos' | 'realizados' | 'pendientes' | 'eliminados';
type EstadoProcedimiento = 'realizado' | 'pendiente' | 'eliminado';
type TipoRecurso = 'medicamento' | 'insumo';

interface SeccionVista {
  id: SeccionProcedimiento;
  titulo: string;
  icono: string;
}

interface FiltroProcedimientoVista {
  id: FiltroProcedimiento;
  etiqueta: string;
}

interface TipoProcedimientoVista {
  id: number;
  nombre: string;
}

/** Recurso del catálogo con la cantidad disponible para solicitar. */
interface RecursoDisponible {
  id: number;
  nombre: string;
  disponible: number;
}

/** Recurso utilizado en un procedimiento o agregado para solicitar a farmacia. */
interface RecursoUtilizado {
  tipo: TipoRecurso;
  referenciaId: number;
  nombre: string;
  cantidad: number;
}

/** Procedimiento del listado y de las tarjetas de resumen. */
interface ProcedimientoVista {
  id: number;
  /** Identificador del tipo de procedimiento en el catálogo. */
  tipoProcedimientoId: number;
  /** Título de la tarjeta: nombre del tipo de procedimiento. */
  tipo: string;
  descripcion: string;
  resultado: string;
  /** Fecha y hora en formato datetime-local. */
  inicio: string;
  fin: string;
  profesional: string;
  estado: EstadoProcedimiento;
  recursos: RecursoUtilizado[];
}

/**
 * Procedimiento médico del episodio: rail de opciones, registro del procedimiento y sus recursos,
 * y consulta de los procedimientos realizados con el detalle de lo utilizado.
 */
@Component({
  selector: 'app-procedimiento-medico',
  imports: [FormsModule, OpcionOtroComponent, TabSwitch],
  templateUrl: './procedimiento-medico.html',
  styleUrl: './procedimiento-medico.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class ProcedimientoMedico implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);
  private readonly servicio = inject(ProcedimientoMedicoService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionTipos?: Subscription;
  private peticionLista?: Subscription;
  private peticionRecursos?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Opción del rail que se muestra en el área central y en el panel derecho. */
  seccionActiva: SeccionProcedimiento = 'registrar';

  /** Filtro de las tarjetas de procedimientos realizados. */
  filtroProcedimiento: FiltroProcedimiento = 'todos';

  /** Campos del formulario de registro. */
  tipoProcedimiento: number | null = null;
  readonly opcionOtroId = -1;
  mostrandoOtroTipo = false;
  creandoTipo = false;
  private tipoAnterior: number | null = null;
  descripcion = '';
  resultado = '';
  inicio = '';
  fin = '';

  /** Estado del buscador y de la selección de recursos. */
  tipoRecurso: TipoRecurso = 'medicamento';
  textoBusquedaRecurso = '';
  busquedaRecursoRealizada = false;
  recursosEncontrados: RecursoDisponible[] = [];
  recursoSeleccionado: RecursoDisponible | null = null;
  cantidadRecurso: number | null = null;

  /** Recursos agregados al procedimiento actual. */
  recursosAgregados: RecursoUtilizado[] = [];

  /** Procedimiento elegido en el listado; su detalle se muestra a la derecha. */
  procedimientoSeleccionado: number | null = null;

  /** Procedimiento cuyos datos están cargados en el formulario; null al registrar uno nuevo. */
  procedimientoEnEdicion: number | null = null;

  /** Tarjeta con su menú de opciones desplegado; null si no hay ninguna. */
  menuProcedimientoAbierto: number | null = null;

  /** Tipos de procedimiento activos del catálogo de gestión clínica. */
  tiposProcedimiento: TipoProcedimientoVista[] = [];

  /** Procedimientos del episodio activo, incluidos los eliminados para su filtro. */
  procedimientos: ProcedimientoVista[] = [];

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargandoTipos = false;
  cargandoProcedimientos = false;
  cargandoRecursos = false;
  guardando = false;
  eliminando = false;
  confirmando = false;
  sinEpisodioActivo = false;

  readonly filtrosProcedimiento: FiltroProcedimientoVista[] = [
    { id: 'todos', etiqueta: 'Todos' },
    { id: 'realizados', etiqueta: 'Realizados' },
    { id: 'pendientes', etiqueta: 'Pendientes' },
    { id: 'eliminados', etiqueta: 'Eliminados' },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    // Un episodio cerrado solo permite consultar los procedimientos realizados.
    if (this.soloLectura) {
      this.seccionActiva = 'realizados';
      this.filtroProcedimiento = 'realizados';
    }

    // El formulario arranca con la fecha y hora actuales; el usuario puede cambiarlas.
    this.inicio = this.fechaHoraActualLocal();
    this.fin = this.fechaHoraActualLocal();

    this.cargarTiposProcedimiento();
    this.cargarProcedimientos();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionTipos?.unsubscribe();
    this.peticionLista?.unsubscribe();
    this.peticionRecursos?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El episodio está cerrado: solo se muestran los procedimientos realizados. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Secciones del rail; en solo lectura únicamente queda la consulta de realizados. */
  get secciones(): SeccionVista[] {
    const registrar: SeccionVista = {
      id: 'registrar',
      titulo: 'Registrar procedimiento',
      icono: 'bi-clipboard2-pulse',
    };
    const realizados: SeccionVista = {
      id: 'realizados',
      titulo: 'Procedimientos realizados',
      icono: 'bi-list-check',
    };

    return this.soloLectura ? [realizados] : [registrar, realizados];
  }

  get esRegistrar(): boolean {
    return this.seccionActiva === 'registrar';
  }

  get etiquetaRecurso(): string {
    return this.tipoRecurso === 'medicamento' ? 'medicamento' : 'insumo';
  }

  get procedimientosFiltrados(): ProcedimientoVista[] {
    if (this.soloLectura) {
      return this.procedimientos.filter(
        (procedimiento) => procedimiento.estado === 'realizado',
      );
    }

    if (this.filtroProcedimiento === 'todos') {
      return this.procedimientos.filter(
        (procedimiento) => procedimiento.estado !== 'eliminado',
      );
    }

    const estado: EstadoProcedimiento =
      this.filtroProcedimiento === 'realizados'
        ? 'realizado'
        : this.filtroProcedimiento === 'pendientes'
          ? 'pendiente'
          : 'eliminado';

    return this.procedimientos.filter((procedimiento) => procedimiento.estado === estado);
  }

  /** Texto del botón del formulario según se registre o se esté editando. */
  get textoBotonRegistro(): string {
    return this.procedimientoEnEdicion === null ? 'Registrar procedimiento' : 'Guardar cambios';
  }

  get procedimientoActivo(): ProcedimientoVista | null {
    const seleccionado = this.procedimientoSeleccionado;
    if (seleccionado === null) return null;

    return this.procedimientos.find((procedimiento) => procedimiento.id === seleccionado) ?? null;
  }

  get puedeRegistrarProcedimiento(): boolean {
    return (
      !this.soloLectura &&
      !this.sinEpisodioActivo &&
      !this.guardando &&
      this.tipoProcedimiento !== null &&
      this.descripcion.trim().length > 0 &&
      this.fechasValidas
    );
  }

  get cantidadMaximaRecurso(): number {
    const seleccionado = this.recursoSeleccionado;
    if (!seleccionado) return 0;

    const existente = this.buscarRecursoAgregado(seleccionado.id);
    return Math.max(0, seleccionado.disponible - (existente?.cantidad ?? 0));
  }

  get puedeAgregarRecurso(): boolean {
    return (
      !this.cargandoRecursos &&
      !this.guardando &&
      this.recursoSeleccionado !== null &&
      this.cantidadRecurso !== null &&
      Number.isInteger(this.cantidadRecurso) &&
      this.cantidadRecurso > 0 &&
      this.cantidadRecurso <= this.cantidadMaximaRecurso
    );
  }

  /** La fecha de inicio es obligatoria; la de fin, si se indica, no puede ser anterior. */
  private get fechasValidas(): boolean {
    if (!this.inicio) return false;

    const inicio = new Date(this.inicio);
    if (Number.isNaN(inicio.getTime())) return false;

    if (!this.fin) return true;

    const fin = new Date(this.fin);

    return !Number.isNaN(fin.getTime()) && fin.getTime() >= inicio.getTime();
  }

  // ------------------- CARGA DE DATOS -------------------
  /** Carga los tipos de procedimiento activos del catálogo. */
  cargarTiposProcedimiento(): void {
    if (this.destruido) return;

    this.peticionTipos?.unsubscribe();
    this.cargandoTipos = true;
    this.cdr.markForCheck();
    this.peticionTipos = this.servicio
      .getTiposProcedimiento()
      .pipe(
        finalize(() => {
          this.cargandoTipos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (tipos) => {
          if (this.destruido) return;

          this.tiposProcedimiento = tipos
            .filter((tipo) => tipo.estado !== false)
            .map((tipo) => ({ id: tipo.id, nombre: tipo.nombre }));
        },
        error: (error) => {
          if (this.destruido) return;

          this.tiposProcedimiento = [];
          this.mostrarError(error, 'No se pudieron cargar los tipos de procedimiento.');
        },
      });
  }

  // ------------------- CREACIÓN DE TIPOS DE PROCEDIMIENTO -------------------
  alElegirTipo(valor: number | null): void {
    if (valor === this.opcionOtroId) {
      this.tipoAnterior = this.tipoProcedimiento;
      this.tipoProcedimiento = null;
      this.mostrandoOtroTipo = true;
      return;
    }

    this.tipoProcedimiento = valor;
  }

  crearTipo(datos: OpcionOtroValor): void {
    if (this.creandoTipo) return;

    this.creandoTipo = true;
    this.servicio
      .postTipoProcedimiento(datos.nombre)
      .pipe(
        finalize(() => {
          this.creandoTipo = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (creado) => {
          if (this.destruido) return;

          this.tiposProcedimiento = [
            ...this.tiposProcedimiento,
            { id: creado.id, nombre: creado.nombre },
          ];
          this.tipoProcedimiento = creado.id;
          this.mostrandoOtroTipo = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo crear el tipo de procedimiento.');
        },
      });
  }

  cancelarTipo(): void {
    this.mostrandoOtroTipo = false;
    this.tipoProcedimiento = this.tipoAnterior;
  }

  /** Carga los procedimientos del episodio activo y conserva la selección indicada. */
  cargarProcedimientos(seleccionarId?: number): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.procedimientos = [];
      this.procedimientoSeleccionado = null;
      this.cargandoProcedimientos = false;
      this.cdr.markForCheck();
      return;
    }

    this.peticionLista?.unsubscribe();
    this.cargandoProcedimientos = true;
    this.cdr.markForCheck();
    this.peticionLista = this.servicio
      .getProcedimientos(episodioId)
      .pipe(
        finalize(() => {
          this.cargandoProcedimientos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuestas) => {
          if (this.destruido) return;

          this.procedimientos = respuestas.map((respuesta) => this.aVista(respuesta));
          if (
            seleccionarId !== undefined &&
            this.procedimientos.some((procedimiento) => procedimiento.id === seleccionarId)
          ) {
            this.procedimientoSeleccionado = seleccionarId;
          }
          this.asegurarProcedimientoSeleccionado();
        },
        error: (error) => {
          if (this.destruido) return;

          this.procedimientos = [];
          this.procedimientoSeleccionado = null;
          this.mostrarError(
            error,
            'No se pudieron cargar los procedimientos. Intente nuevamente.',
          );
        },
      });
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Cambia la opción del rail y mantiene una tarjeta seleccionada en el listado. */
  seleccionarSeccion(id: SeccionProcedimiento): void {
    if (this.soloLectura && id === 'registrar') return;

    this.cerrarMenuProcedimiento();
    this.seccionActiva = id;

    if (id === 'realizados') {
      this.asegurarProcedimientoSeleccionado();
    }
  }

  /** Filtra las tarjetas por estado y ajusta la selección del detalle. */
  seleccionarFiltroProcedimiento(filtro: FiltroProcedimiento): void {
    this.cerrarMenuProcedimiento();
    this.filtroProcedimiento = filtro;
    this.asegurarProcedimientoSeleccionado();
  }

  /** Muestra el detalle del procedimiento pulsado. */
  seleccionarProcedimiento(id: number): void {
    this.procedimientoSeleccionado = id;
  }

  /** Muestra u oculta el menú de opciones de la tarjeta. */
  alternarMenuProcedimiento(id: number): void {
    if (this.soloLectura) return;

    this.menuProcedimientoAbierto = this.menuProcedimientoAbierto === id ? null : id;
  }

  /** Cierra el menú de opciones desplegado. */
  cerrarMenuProcedimiento(): void {
    this.menuProcedimientoAbierto = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuProcedimientoAbierto === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.procedimiento-card');
    const tarjetaAbierta = tarjeta?.dataset['procedimientoId'];

    if (tarjetaAbierta !== String(this.menuProcedimientoAbierto)) {
      this.cerrarMenuProcedimiento();
    }
  }

  /** Carga en el formulario el procedimiento elegido para corregirlo. */
  editarProcedimiento(procedimiento: ProcedimientoVista): void {
    if (this.soloLectura || this.guardando || this.eliminando || this.confirmando) return;

    let tipo = this.tiposProcedimiento.find(
      (opcion) => opcion.id === procedimiento.tipoProcedimientoId,
    );

    // El tipo puede estar inactivo en el catálogo y no venir en la lista de activos.
    if (!tipo) {
      tipo = { id: procedimiento.tipoProcedimientoId, nombre: procedimiento.tipo };
      this.tiposProcedimiento = [...this.tiposProcedimiento, tipo];
    }

    this.tipoProcedimiento = tipo?.id ?? null;
    this.descripcion = procedimiento.descripcion;
    this.resultado = procedimiento.resultado;
    this.inicio = procedimiento.inicio;
    this.fin = procedimiento.fin;
    this.recursosAgregados = procedimiento.recursos.map((recurso) => ({ ...recurso }));
    this.cancelarSeleccionRecurso();
    this.procedimientoEnEdicion = procedimiento.id;
    this.seccionActiva = 'registrar';
    this.cerrarMenuProcedimiento();
  }

  /** Marca el procedimiento como eliminado después de confirmarlo. */
  async eliminarProcedimiento(procedimiento: ProcedimientoVista): Promise<void> {
    this.cerrarMenuProcedimiento();

    if (this.soloLectura || this.eliminando || this.guardando || this.confirmando) return;

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el procedimiento "${procedimiento.tipo}"?`)
      .catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.peticionAccion?.unsubscribe();
    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion = this.servicio
      .eliminarProcedimiento(procedimiento.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          if (this.procedimientoEnEdicion === procedimiento.id) {
            this.limpiarFormulario();
            this.limpiarRecursos();
          }

          this.popUps.exito('Procedimiento eliminado exitosamente.');
          this.cargarProcedimientos();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar el procedimiento. Intente nuevamente.');
        },
      });
  }

  /** Registra o actualiza el procedimiento con sus fechas y los recursos agregados. */
  async registrarProcedimiento(): Promise<void> {
    if (this.destruido || this.guardando || this.eliminando || this.confirmando) return;

    if (this.soloLectura) {
      this.popUps.advertencia('El episodio está cerrado y no permite registrar procedimientos.');
      return;
    }

    if (!this.puedeRegistrarProcedimiento) {
      this.popUps.advertencia(
        'Complete el tipo, la descripción y la fecha de inicio; la fecha de fin, si se indica, no puede ser anterior al inicio.',
      );
      return;
    }

    const episodioId = this.episodioActivo.obtener();
    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const tipoProcedimientoId = this.tipoProcedimiento;
    const inicio = this.aLocalDateTime(this.inicio);
    if (tipoProcedimientoId === null || !inicio) return;

    const idEdicion = this.procedimientoEnEdicion;
    const tipo = this.tiposProcedimiento.find((opcion) => opcion.id === tipoProcedimientoId);

    if (idEdicion !== null) {
      this.confirmando = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps
        .confirmarToast(
          `¿Está seguro de guardar los cambios del procedimiento "${tipo?.nombre ?? ''}"?`,
        )
        .catch(() => false);
      this.confirmando = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
    }

    const request: ProcedimientoMedicoRequest = {
      tipoProcedimientoId,
      descripcion: this.descripcion.trim(),
      resultado: this.resultado.trim() || null,
      inicio,
      fin: this.fin ? this.aLocalDateTime(this.fin) : null,
      episodioId,
      usuarioId,
      recursos: this.recursosAgregados.map((recurso) => ({
        tipo: this.aTipoRecursoApi(recurso.tipo),
        referenciaId: recurso.referenciaId,
        cantidad: recurso.cantidad,
      })),
    };

    this.peticionAccion?.unsubscribe();
    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion = (
      idEdicion === null
        ? this.servicio.crearProcedimiento(request)
        : this.servicio.actualizarProcedimiento(idEdicion, request)
    )
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;

          this.limpiarFormulario();
          this.limpiarRecursos();
          this.filtroProcedimiento = 'todos';
          this.seccionActiva = 'realizados';
          this.procedimientoSeleccionado = respuesta.id;
          this.popUps.exito(
            idEdicion === null
              ? 'Procedimiento registrado exitosamente.'
              : 'Procedimiento actualizado exitosamente.',
          );
          this.cargarProcedimientos(respuesta.id);
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el procedimiento. Intente nuevamente.');
        },
      });
  }

  /** Descarta el formulario y los recursos agregados. */
  cancelarRegistro(): void {
    this.limpiarFormulario();
    this.limpiarRecursos();
  }

  /** Cambia entre medicamentos e insumos y reinicia la búsqueda. */
  cambiarTipoRecurso(esMedicamento: boolean): void {
    this.tipoRecurso = esMedicamento ? 'medicamento' : 'insumo';
    this.cancelarSeleccionRecurso();
  }

  /** Busca en el catálogo de farmacia del tipo de recurso activo. */
  buscarRecursos(): void {
    if (this.destruido || this.cargandoRecursos) return;

    this.peticionRecursos?.unsubscribe();
    this.busquedaRecursoRealizada = true;
    this.cargandoRecursos = true;
    this.recursoSeleccionado = null;
    this.cantidadRecurso = null;
    this.recursosEncontrados = [];
    this.cdr.markForCheck();
    this.peticionRecursos = this.servicio
      .buscarRecursos(this.aTipoRecursoApi(this.tipoRecurso), this.textoBusquedaRecurso)
      .pipe(
        finalize(() => {
          this.cargandoRecursos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (recursos) => {
          if (this.destruido) return;

          this.recursosEncontrados = recursos;
        },
        error: (error) => {
          if (this.destruido) return;

          this.recursosEncontrados = [];
          this.mostrarError(error, `No se pudo buscar ${this.etiquetaRecurso} en farmacia.`);
        },
      });
  }

  /** Elige el recurso de la tabla: oculta el buscador y deja solo la captura de cantidad. */
  seleccionarRecurso(recurso: RecursoDisponible): void {
    this.recursoSeleccionado = recurso;
    this.cantidadRecurso = 1;
    this.busquedaRecursoRealizada = false;
    this.recursosEncontrados = [];
    this.textoBusquedaRecurso = '';
  }

  /** Vuelve al buscador sin agregar el recurso seleccionado. */
  cancelarSeleccionRecurso(): void {
    this.recursoSeleccionado = null;
    this.cantidadRecurso = null;
    this.busquedaRecursoRealizada = false;
    this.recursosEncontrados = [];
    this.textoBusquedaRecurso = '';
  }

  /** Suma el recurso seleccionado a la lista, sin superar la cantidad disponible. */
  agregarRecurso(): void {
    const seleccionado = this.recursoSeleccionado;
    const cantidad = this.cantidadRecurso;

    if (!seleccionado || cantidad === null || !this.puedeAgregarRecurso) {
      return;
    }

    const existente = this.buscarRecursoAgregado(seleccionado.id);

    if (existente) {
      this.recursosAgregados = this.recursosAgregados.map((recurso) =>
        recurso === existente
          ? { ...recurso, cantidad: recurso.cantidad + cantidad }
          : recurso,
      );
    } else {
      this.recursosAgregados = [
        ...this.recursosAgregados,
        {
          tipo: this.tipoRecurso,
          referenciaId: seleccionado.id,
          nombre: seleccionado.nombre,
          cantidad,
        },
      ];
    }

    this.cancelarSeleccionRecurso();
  }

  /** Quita de la lista el recurso indicado por su posición. */
  quitarRecurso(indice: number): void {
    this.recursosAgregados = this.recursosAgregados.filter((_, posicion) => posicion !== indice);
  }

  /** Texto del rango de fechas y horas; si no hay fin, muestra solo el inicio. */
  formatearRango(inicio: string, fin: string): string {
    const fechaInicio = new Date(inicio);

    if (Number.isNaN(fechaInicio.getTime())) {
      return '';
    }

    const dosDigitos = (valor: number): string => `${valor}`.padStart(2, '0');
    const dia = (fecha: Date): string =>
      `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
    const hora = (fecha: Date): string =>
      `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

    if (!fin) {
      return `${dia(fechaInicio)} · ${hora(fechaInicio)}`;
    }

    const fechaFin = new Date(fin);

    if (Number.isNaN(fechaFin.getTime())) {
      return `${dia(fechaInicio)} · ${hora(fechaInicio)}`;
    }

    if (fechaInicio.toDateString() === fechaFin.toDateString()) {
      return `${dia(fechaInicio)} · ${hora(fechaInicio)} - ${hora(fechaFin)}`;
    }

    return `${dia(fechaInicio)} ${hora(fechaInicio)} - ${dia(fechaFin)} ${hora(fechaFin)}`;
  }

  /** Fecha y hora de un valor datetime-local, para el detalle del procedimiento. */
  formatearFechaHora(valor: string): string {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return '';
    }

    const dosDigitos = (numero: number): string => `${numero}`.padStart(2, '0');
    const dia = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
    const hora = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

    return `${dia} · ${hora}`;
  }

  // ------------------- APOYO -------------------
  /** Convierte la respuesta del backend a los datos que pintan las tarjetas. */
  private aVista(respuesta: ProcedimientoMedicoResponse): ProcedimientoVista {
    return {
      id: respuesta.id,
      tipoProcedimientoId: respuesta.tipoProcedimientoId,
      tipo: respuesta.tipoProcedimientoNombre,
      descripcion: respuesta.descripcion,
      resultado: respuesta.resultado ?? '',
      inicio: this.aDatetimeLocal(respuesta.inicio),
      fin: this.aDatetimeLocal(respuesta.fin),
      profesional: respuesta.usuarioNombre?.trim() || 'Médico de turno',
      estado: this.aEstadoVista(respuesta.estado),
      recursos: respuesta.recursos.map((recurso) => ({
        tipo: recurso.tipo === 'MEDICAMENTO' ? 'medicamento' : 'insumo',
        referenciaId: recurso.referenciaId,
        nombre: recurso.nombre,
        cantidad: recurso.cantidad,
      })),
    };
  }

  /** Estado del backend al estado con el que la vista colorea las tarjetas. */
  private aEstadoVista(estado: EstadoProcedimientoApi): EstadoProcedimiento {
    if (estado === 'REALIZADO') return 'realizado';
    if (estado === 'ELIMINADO') return 'eliminado';
    return 'pendiente';
  }

  /** Tipo de recurso de la vista al enum del backend. */
  private aTipoRecursoApi(tipo: TipoRecurso): TipoRecursoProcedimientoApi {
    return tipo === 'medicamento' ? 'MEDICAMENTO' : 'INSUMO';
  }

  /** Fecha y hora del backend al valor que acepta datetime-local. */
  private aDatetimeLocal(valor: string | null): string {
    if (!valor) return '';
    return valor.length >= 16 ? valor.slice(0, 16) : valor;
  }

  /** Fecha y hora del formulario al formato ISO que espera el backend. */
  private aLocalDateTime(valor: string): string | null {
    const texto = valor.trim();
    if (!texto) return null;
    return texto.length === 16 ? `${texto}:00` : texto;
  }

  /** Deja el formulario listo para un procedimiento nuevo, con las fechas actuales. */
  private limpiarFormulario(): void {
    this.tipoProcedimiento = null;
    this.descripcion = '';
    this.resultado = '';
    this.inicio = this.fechaHoraActualLocal();
    this.fin = this.fechaHoraActualLocal();
    this.procedimientoEnEdicion = null;
  }

  /** Fecha y hora actuales en el formato que espera el input datetime-local. */
  private fechaHoraActualLocal(): string {
    const ahora = new Date();
    const dosDigitos = (valor: number): string => `${valor}`.padStart(2, '0');

    return (
      `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}` +
      `T${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`
    );
  }

  /** Limpia la búsqueda y la lista de recursos del procedimiento actual. */
  private limpiarRecursos(): void {
    this.recursosAgregados = [];
    this.cancelarSeleccionRecurso();
  }

  /** El recurso ya agregado del mismo tipo y referencia, si existe. */
  private buscarRecursoAgregado(referenciaId: number): RecursoUtilizado | undefined {
    return this.recursosAgregados.find(
      (recurso) => recurso.tipo === this.tipoRecurso && recurso.referenciaId === referenciaId,
    );
  }

  /** Deja seleccionada una tarjeta válida cuando el filtro o la sección cambian. */
  private asegurarProcedimientoSeleccionado(): void {
    const lista = this.procedimientosFiltrados;

    if (!lista.some((procedimiento) => procedimiento.id === this.procedimientoSeleccionado)) {
      this.procedimientoSeleccionado = lista[0]?.id ?? null;
    }
  }

  /** Distingue el timeout de comunicación del resto de errores del backend. */
  private mostrarError(error: unknown, mensajeDefault: string): void {
    if (error instanceof TimeoutError) {
      this.popUps.error(
        'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
      );
      return;
    }

    this.popUps.errorDesdeBackend(error, mensajeDefault);
  }
}
