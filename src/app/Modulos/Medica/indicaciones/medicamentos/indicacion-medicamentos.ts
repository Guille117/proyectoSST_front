import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, Subscription, timeout, TimeoutError } from 'rxjs';
import { Paginacion } from '../../../../shared/paginacion/paginacion';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { AuthService } from '../../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { TIMEOUT_HTTP_MS } from '../../evaluacion/data/constantes-clinicas';
import {
  DuracionVista,
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias as calcularFaltaDuracion,
} from '../data/duracion';
import {
  EstadoIndicacionMedicamento,
  MedicamentoCatalogoResponse,
  MedicamentoIndicacionRequest,
  MedicamentoIndicacionResponse,
  TipoDuracionApi,
} from './data/medicamentoInterfaz';
import { MedicamentoIndicacionService } from './data/medicamento-service';
import { RegistrosEnfermeriaService } from '../../../Enfermeria/data/registrosEnfermeriaService';
import { AplicacionMedicamentoResponse } from '../../../Enfermeria/data/registrosEnfermeriaInterfaz';

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de las tarjetas. */
/** Colores de acento lateral de la tarjeta de la indicación; describen su estado. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Estados en los que puede quedar una indicación vista en el listado. */
type EstadoIndicacionVista = 'activa' | 'finalizada' | 'eliminada';

/** Filtros del listado de lo indicado: un estado concreto o «todas» las indicaciones vigentes. */
type FiltroIndicacion = 'todas' | 'activas' | 'finalizadas' | 'eliminadas';

/** Indicación de medicamento lista para pintar la tarjeta del listado. */
interface IndicacionMedicamentoVista extends DuracionVista {
  id: number;
  medicamentoLogId: number | null;
  nombre: string;
  /** Texto libre cuando el medicamento no está registrado en el catálogo. */
  medicamentoLibre: string;
  /** Presentación del medicamento o abreviatura de la unidad guardada con la indicación. */
  presentacion: string;
  /** Cantidad indicada; el contrato la exige como entero mayor a 0. */
  cantidad: number;
  /** Frecuencia indicada; el contrato la exige como entero mayor a 0. */
  frecuencia: number;
  observaciones: string;
  fechaInicio: string;
  fecha: string;
  hora: string;
  medico: string;
  estado: EstadoIndicacionVista;
  tono: TonoIndicacion;
}

/** Registro de Enfermería listo para la tabla desplegable de la tarjeta. */
interface AplicacionMedicamentoVista {
  id: number;
  numero: number;
  fechaHoraProgramada: string;
  fechaRegistro: string;
  estado: string;
  esPositivo: boolean;
  usuario: string;
  observacion: string;
}

/** Opción del filtro que decide qué indicaciones se muestran en el listado. */
interface FiltroIndicacionVista {
  id: FiltroIndicacion;
  etiqueta: string;
  /** Estados del backend que reúne la opción; «Todas» excluye las eliminadas. */
  estados: EstadoIndicacionMedicamento[];
}

/**
 * Sección de medicamentos de las indicaciones médicas: registro de la indicación con la búsqueda del
 * medicamento en el catálogo y listado de los medicamentos indicados en el episodio. Las operaciones
 * se guardan contra el backend; el episodio y el usuario salen del contexto de la sesión.
 */
@Component({
  selector: 'app-indicacion-medicamentos',
  imports: [FormsModule, NgClass, Paginacion],
  templateUrl: './indicacion-medicamentos.html',
  styleUrl: './indicacion-medicamentos.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class IndicacionMedicamentos implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly servicio = inject(MedicamentoIndicacionService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly registrosEnfermeria = inject(RegistrosEnfermeriaService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionCatalogo?: Subscription;
  private peticionUnidades?: Subscription;
  private peticionAccion?: Subscription;
  private peticionRegistros?: Subscription;
  private destruido = false;

  /** Abreviatura de cada unidad de medida del catálogo, por nombre de la unidad. */
  private readonly abreviaturasUnidad = new Map<string, string>();

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Campos del formulario de la indicación. */
  medicamento = '';
  /** Medicamento no registrado escrito por el usuario. */
  medicamentoLibre = '';
  cantidad: number | null = null;
  unidadMedida = '';
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
  fechaInicio = this.fechaHoraLocalActual();
  observaciones = '';

  /** Medicamentos que devolvió la última búsqueda del catálogo. */
  medicamentosEncontrados: MedicamentoCatalogoResponse[] = [];

  /**
   * La búsqueda está desplegada: el formulario muestra su buscador con la tabla de resultados y oculta
   * el resto de campos hasta que se elija un medicamento.
   */
  busquedaMedicamentoRealizada = false;
  cargandoCatalogo = false;

  /** Página de la tabla de resultados que se está viendo. */
  paginaMedicamentos = 1;

  /** Medicamentos que muestra cada página de la tabla de resultados. */
  readonly medicamentosPorPagina = 5;

  /** Medicamento del catálogo elegido para la indicación; null mientras no se elija ninguno. */
  medicamentoElegido: MedicamentoCatalogoResponse | null = null;

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Indicación cuyos datos están cargados en el formulario; null al capturar una nueva. */
  indicacionEnEdicion: number | null = null;

  /** Indicaciones del episodio con el filtro elegido, ya traducidas a la vista. */
  indicaciones: IndicacionMedicamentoVista[] = [];

  /** Tarjeta cuyos registros de Enfermería están desplegados; null si ninguno. */
  registrosIndicacionAbierta: number | null = null;

  /** Observación que se muestra al pasar el puntero por un registro. */
  observacionPopup: { texto: string; x: number; y: number } | null = null;

  /** Aplicaciones de Enfermería cargadas por indicación. */
  private readonly registrosPorIndicacion = new Map<number, AplicacionMedicamentoVista[]>();

  /** Estado de la carga de los registros de la tarjeta desplegada. */
  cargandoRegistros = false;
  errorRegistros = false;

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  eliminando = false;
  cambiandoEstado = false;
  confirmando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

  /**
   * Unidades de medida del catálogo de farmacia; «Gotas» se agrega siempre al final para que esté
   * disponible aunque el catálogo no la tenga registrada.
   */
  unidadesMedida: string[] = ['Gotas'];

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de lo indicado; abre mostrando las indicaciones vigentes. */
  filtroIndicacion: FiltroIndicacion = 'todas';

  /** Opciones del filtro: los estados de la indicación y «Todas», que deja fuera las eliminadas. */
  readonly filtrosIndicacion: FiltroIndicacionVista[] = [
    { id: 'todas', etiqueta: 'Todas', estados: ['ACTIVO', 'FINALIZADO'] },
    { id: 'activas', etiqueta: 'Activas', estados: ['ACTIVO'] },
    { id: 'finalizadas', etiqueta: 'Finalizadas', estados: ['FINALIZADO'] },
    { id: 'eliminadas', etiqueta: 'Eliminadas', estados: ['ELIMINADO'] },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarUnidadesMedida();
    this.cargarIndicaciones();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionCatalogo?.unsubscribe();
    this.peticionUnidades?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.peticionRegistros?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay un medicamento escrito. */
  get hayMedicamento(): boolean {
    return this.medicamento.trim().length > 0;
  }

  /** Hay un medicamento del catálogo o un medicamento libre listo para indicar. */
  get hayMedicamentoSeleccionado(): boolean {
    return this.medicamentoElegido !== null || this.medicamentoLibre.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el tratamiento. */
  get faltaDuracionEnDias(): boolean {
    return calcularFaltaDuracion(this.duracionTipo, this.duracionCantidad);
  }

  /**
   * El botón Guardar se habilita con un medicamento del catálogo elegido, la cantidad y la frecuencia
   * enteras, la duración resuelta y las observaciones dentro del límite del backend.
   */
  get puedeGuardar(): boolean {
    return (
      !this.busquedaMedicamentoRealizada &&
      this.hayMedicamentoSeleccionado &&
      !this.faltaDuracionEnDias &&
      this.duracionTipo !== '' &&
      this.fechaInicio.trim().length > 0 &&
      this.cantidad !== null &&
      Number.isInteger(this.cantidad) &&
      this.cantidad > 0 &&
      this.frecuencia !== null &&
      Number.isInteger(this.frecuencia) &&
      this.frecuencia > 0 &&
      this.observaciones.length <= 2000 &&
      !this.guardando &&
      !this.confirmando
    );
  }

  /** Indicaciones que muestra el listado; el backend ya aplica el filtro elegido. */
  get indicacionesFiltradas(): IndicacionMedicamentoVista[] {
    return this.indicaciones;
  }

  /** Texto del listado cuando el filtro elegido no tiene indicaciones. */
  get mensajeSinIndicaciones(): string {
    const filtro = this.filtroActual;

    return filtro.id === 'todas'
      ? 'Aún no hay medicamentos indicados para el paciente.'
      : `No hay indicaciones ${filtro.etiqueta.toLowerCase()}.`;
  }

  /** Filas de la página actual de la tabla de resultados. */
  get medicamentosDeLaPagina(): MedicamentoCatalogoResponse[] {
    const inicio = (this.paginaMedicamentos - 1) * this.medicamentosPorPagina;

    return this.medicamentosEncontrados.slice(inicio, inicio + this.medicamentosPorPagina);
  }

  /** Número que le corresponde a la primera fila de la página actual de la tabla. */
  get numeroInicialDeLaPagina(): number {
    return (this.paginaMedicamentos - 1) * this.medicamentosPorPagina + 1;
  }

  /** Texto del medicamento elegido: su descripción y su vía de administración si la tiene. */
  get textoMedicamentoElegido(): string {
    if (this.medicamentoLibre.trim()) {
      return `${this.medicamentoLibre.trim()} · No registrado`;
    }

    const elegido = this.medicamentoElegido;
    if (!elegido) return '';

    const descripcion = this.descripcionMedicamento(elegido);
    const via = elegido.viaAdministracion
      ? `, administración ${elegido.viaAdministracion.toLowerCase()}`
      : '';
    const sinExistencia =
      elegido.disponibleConocido !== false && elegido.disponible <= 0
        ? ' · Sin existencia'
        : '';
    return `${descripcion}${via}${sinExistencia}`;
  }

  /** Texto de la tabla de resultados cuando la búsqueda no encuentra medicamentos en el catálogo. */
  get mensajeSinMedicamentosEncontrados(): string {
    const termino = this.medicamento.trim();

    return termino
      ? `No se encontraron medicamentos que coincidan con «${termino}».`
      : 'El catálogo no tiene medicamentos para mostrar.';
  }

  /** Texto de la cantidad con su unidad: «1 tableta», «2 tabletas», «5 ml». */
  textoCantidad(indicacion: IndicacionMedicamentoVista): string {
    return `${indicacion.cantidad} ${this.unidadDe(indicacion)}`;
  }

  /** Texto de la frecuencia: «cada 4 horas» o «cada 1 hora». */
  textoFrecuencia(indicacion: IndicacionMedicamentoVista): string {
    return `cada ${indicacion.frecuencia} ${indicacion.frecuencia === 1 ? 'hora' : 'horas'}`;
  }

  /** Texto de la duración que muestra la tarjeta: «por 1 día», «dosis única»... */
  textoDuracion(registro: DuracionVista): string {
    if (registro.duracionTipo === 'dias') {
      const dias = registro.duracionCantidad ?? 0;
      return `por ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }

    if (registro.duracionTipo === 'unica') return 'dosis única';
    if (registro.duracionTipo === 'indefinida') return 'por tiempo indefinido';
    return '';
  }

  // ------------------- CARGA DE LAS UNIDADES DE MEDIDA -------------------
  /** Carga del catálogo las unidades de medida y les suma «Gotas». */
  cargarUnidadesMedida(): void {
    if (this.destruido) return;

    this.peticionUnidades?.unsubscribe();
    this.peticionUnidades = this.catalogoService
      .listarUnidadMedida()
      .pipe(
        timeout(TIMEOUT_HTTP_MS),
        finalize(() => {
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (unidades) => {
          if (this.destruido) return;

          this.abreviaturasUnidad.clear();
          for (const unidad of unidades) {
            const nombre = unidad.nombre?.trim();
            const abreviatura = unidad.abreviatura?.trim();
            if (nombre && abreviatura) this.abreviaturasUnidad.set(nombre, abreviatura);
          }

          this.unidadesMedida = this.combinarUnidades(unidades.map((unidad) => unidad.nombre));
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudieron cargar las unidades de medida.');
        },
      });
  }

  /** Une las unidades del catálogo con «Gotas», sin repetir nombres equivalentes. */
  private combinarUnidades(unidades: string[]): string[] {
    const resultado: string[] = [];
    const vistos = new Set<string>();

    for (const unidad of [...unidades, 'Gotas']) {
      const nombre = unidad?.trim();
      if (!nombre) continue;

      const clave = this.singularizar(nombre.toLowerCase());
      if (vistos.has(clave)) continue;

      vistos.add(clave);
      resultado.push(nombre);
    }

    return resultado;
  }

  // ------------------- CARGA DEL LISTADO -------------------
  /** Carga las indicaciones del episodio activo con el filtro elegido. */
  cargarIndicaciones(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.indicaciones = [];
      this.errorCarga = false;
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }

    const estados = this.filtroActual.estados;
    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();
    this.peticionLista?.unsubscribe();

    const consultas = estados.map((estado) =>
      this.servicio.getIndicacionesPorEpisodio(episodioId, estado),
    );
    const peticion =
      consultas.length === 1 ? consultas[0].pipe(map((lista) => [lista])) : forkJoin(consultas);

    this.peticionLista = peticion
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (grupos) => {
          if (this.destruido) return;

          const respuestas = grupos
            .flat()
            .sort(
              (a, b) =>
                new Date(b.fechaInicio || b.fecha).getTime() -
                new Date(a.fechaInicio || a.fecha).getTime(),
            );

          this.indicaciones = respuestas.map((respuesta) => this.aVista(respuesta));
        },
        error: (error) => {
          if (this.destruido) return;

          this.indicaciones = [];
          this.mostrarError(error, 'No se pudieron cargar las indicaciones. Intente nuevamente.');
        },
      });
  }

  /** Muestra el estado elegido y recarga el listado del episodio. */
  seleccionarFiltroIndicacion(filtro: FiltroIndicacion): void {
    this.filtroIndicacion = filtro;
    this.cerrarMenuIndicacion();
    this.registrosIndicacionAbierta = null;

    // La indicación en edición puede quedar fuera del listado que se va a cargar
    if (this.indicacionEnEdicion !== null) {
      this.limpiarFormulario();
    }

    this.cargarIndicaciones();
  }

  // ------------------- BÚSQUEDA DEL CATÁLOGO -------------------
  /** Descripción del medicamento para la tabla de resultados. */
  descripcionMedicamento(opcion: MedicamentoCatalogoResponse): string {
    return [opcion.nombre, opcion.marca, opcion.presentacion]
      .filter((parte) => parte?.trim())
      .join(' ');
  }

  /** Concentración del medicamento para la tabla de resultados: «500 mg». */
  concentracionMedicamento(opcion: MedicamentoCatalogoResponse): string {
    const dosis = opcion.dosis > 0 ? `${opcion.dosis}` : '';
    const unidad = opcion.unidadMedida?.trim() ?? '';

    return [dosis, unidad].filter(Boolean).join(' ');
  }

  /** Busca el medicamento escrito en el catálogo de farmacia y muestra la tabla de resultados. */
  buscarMedicamento(): void {
    if (this.destruido || this.cargandoCatalogo) return;

    this.busquedaMedicamentoRealizada = true;
    this.paginaMedicamentos = 1;
    this.cargandoCatalogo = true;
    this.cdr.markForCheck();
    this.peticionCatalogo?.unsubscribe();

    this.peticionCatalogo = this.servicio
      .buscarCatalogo(this.medicamento)
      .pipe(
        finalize(() => {
          this.cargandoCatalogo = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (catalogo) => {
          if (this.destruido) return;

          this.medicamentosEncontrados = catalogo;
        },
        error: (error) => {
          if (this.destruido) return;

          this.medicamentosEncontrados = [];
          this.mostrarError(
            error,
            'No se pudo buscar en el catálogo de medicamentos. Intente nuevamente.',
          );
        },
      });
  }

  /** Muestra otra página de la tabla de resultados. */
  seleccionarPaginaMedicamentos(pagina: number): void {
    this.paginaMedicamentos = pagina;
  }

  /**
   * Elige el medicamento pulsado en la tabla de resultados: su descripción queda registrada en la
   * indicación y el buscador con la tabla dejan su sitio al medicamento elegido.
   */
  seleccionarMedicamento(opcion: MedicamentoCatalogoResponse): void {
    this.cerrarResultadosMedicamento();
    this.medicamento = this.descripcionMedicamento(opcion);
    this.medicamentoLibre = '';
    this.medicamentoElegido = opcion;
  }

  /** Indica como medicamento no registrado el texto escrito en el buscador. */
  usarMedicamentoLibre(): void {
    const texto = this.medicamento.trim();
    if (!texto) {
      this.popUps.advertencia('Escriba el medicamento o sus detalles.');
      return;
    }

    this.medicamentoLibre = texto;
    this.medicamentoElegido = null;
    this.cerrarResultadosMedicamento();
  }

  /** Devuelve el formulario al buscador para elegir otro medicamento en lugar del elegido. */
  cambiarMedicamento(): void {
    this.medicamento = '';
    this.medicamentoLibre = '';
    this.cerrarResultadosMedicamento();
    this.buscarMedicamento();
  }

  /** Cierra la tabla de resultados de la búsqueda y suelta el medicamento elegido. */
  cerrarResultadosMedicamento(): void {
    this.busquedaMedicamentoRealizada = false;
    this.paginaMedicamentos = 1;
    this.medicamentosEncontrados = [];
    this.medicamentoElegido = null;
  }

  // ------------------- MENÚ DE LA TARJETA -------------------
  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuIndicacion(id: number): void {
    this.menuIndicacionAbierta = this.menuIndicacionAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuIndicacion(): void {
    this.menuIndicacionAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuIndicacionAbierta === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.indicacion-card');
    // Cada tarjeta del listado lleva el identificador de su indicación
    const tarjetaAbierta = tarjeta?.dataset['indicacionId'];

    if (tarjetaAbierta !== String(this.menuIndicacionAbierta)) {
      this.cerrarMenuIndicacion();
    }
  }

  // ------------------- REGISTROS DE ENFERMERÍA -------------------
  /** Indica si los registros de Enfermería de la tarjeta están desplegados. */
  registrosAbiertos(id: number): boolean {
    return this.registrosIndicacionAbierta === id;
  }

  /** Despliega u oculta los registros de Enfermería de la indicación. */
  alternarRegistros(indicacion: IndicacionMedicamentoVista): void {
    this.ocultarObservacion();

    if (this.registrosIndicacionAbierta === indicacion.id) {
      this.registrosIndicacionAbierta = null;
      return;
    }

    this.registrosIndicacionAbierta = indicacion.id;
    this.cargarRegistros(indicacion.id);
  }

  /** Muestra la observación del registro junto al puntero. */
  mostrarObservacion(evento: MouseEvent, observacion: string | null | undefined): void {
    const texto = observacion?.trim();
    if (!texto) {
      this.observacionPopup = null;
      return;
    }

    this.observacionPopup = { texto, ...this.posicionObservacion(evento) };
  }

  /** Mantiene el popup junto al puntero mientras recorre la fila. */
  moverObservacion(evento: MouseEvent): void {
    if (!this.observacionPopup) return;

    this.observacionPopup = { ...this.observacionPopup, ...this.posicionObservacion(evento) };
  }

  /** Oculta la observación al salir de la fila. */
  ocultarObservacion(): void {
    this.observacionPopup = null;
  }

  private posicionObservacion(evento: MouseEvent): { x: number; y: number } {
    const margen = 14;
    const ancho = 320;

    return {
      x: Math.min(evento.clientX + margen, Math.max(8, window.innerWidth - ancho - 8)),
      y: evento.clientY + margen,
    };
  }

  /** Registros de Enfermería ya cargados de una indicación. */
  registrosDe(id: number): AplicacionMedicamentoVista[] {
    return this.registrosPorIndicacion.get(id) ?? [];
  }

  /** Consulta las aplicaciones registradas por Enfermería para la indicación. */
  private cargarRegistros(indicacionId: number): void {
    if (this.destruido) return;

    this.cargandoRegistros = true;
    this.errorRegistros = false;
    this.cdr.markForCheck();
    this.peticionRegistros?.unsubscribe();

    this.peticionRegistros = this.registrosEnfermeria
      .buscarAplicacionesPorIndicacion(indicacionId)
      .pipe(
        finalize(() => {
          this.cargandoRegistros = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (registros) => {
          if (this.destruido) return;

          this.registrosPorIndicacion.set(
            indicacionId,
            registros.map((registro, indice) => this.aAplicacionVista(registro, indice)),
          );
        },
        error: (error) => {
          if (this.destruido) return;

          this.errorRegistros = true;
          this.registrosPorIndicacion.delete(indicacionId);
          this.mostrarError(error, 'No se pudieron cargar los registros de Enfermería.');
        },
      });
  }

  /** Traduce una aplicación de Enfermería a la fila de la tabla. */
  private aAplicacionVista(
    respuesta: AplicacionMedicamentoResponse,
    indice: number,
  ): AplicacionMedicamentoVista {
    const programada = new Date(respuesta.fechaHoraProgramada);
    const registrada = new Date(respuesta.fechaRegistro);

    return {
      id: respuesta.id,
      numero: indice + 1,
      fechaHoraProgramada: this.formatearFechaHora(programada),
      fechaRegistro: this.formatearFechaHora(registrada),
      estado: respuesta.estado === 'ADMINISTRADO' ? 'Administrado' : 'No administrado',
      esPositivo: respuesta.estado === 'ADMINISTRADO',
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
    };
  }

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el formulario la indicación elegida para corregirla. */
  editarIndicacion(indicacion: IndicacionMedicamentoVista): void {
    if (this.guardando || this.eliminando || this.cambiandoEstado) return;

    this.cerrarMenuIndicacion();
    this.indicacionEnEdicion = indicacion.id;

    if (indicacion.medicamentoLogId === null) {
      this.medicamentoElegido = null;
      this.medicamentoLibre = indicacion.medicamentoLibre || indicacion.nombre;
      this.medicamento = this.medicamentoLibre;
    } else {
      this.medicamentoElegido = this.catalogoMinimo(indicacion);
      this.medicamentoLibre = '';
      this.medicamento = indicacion.nombre;
    }

    this.cantidad = indicacion.cantidad;
    this.unidadMedida = this.unidadDesdePresentacion(indicacion.presentacion);
    this.frecuencia = indicacion.frecuencia;
    this.duracionTipo = indicacion.duracionTipo;
    this.duracionCantidad = indicacion.duracionCantidad;
    this.fechaInicio = this.aFechaHoraInput(indicacion.fechaInicio);
    this.observaciones = indicacion.observaciones;
    this.busquedaMedicamentoRealizada = false;
    this.medicamentosEncontrados = [];
    this.paginaMedicamentos = 1;
  }

  /** Deja el formulario listo para capturar una indicación nueva. */
  limpiarFormulario(): void {
    this.medicamento = '';
    this.medicamentoLibre = '';
    this.cantidad = null;
    this.unidadMedida = '';
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.fechaInicio = this.fechaHoraLocalActual();
    this.observaciones = '';
    this.indicacionEnEdicion = null;
    this.cerrarResultadosMedicamento();
  }

  /**
   * Crea la indicación o actualiza la que está en edición. El cuerpo lleva el episodio activo, el
   * usuario de la sesión y los valores ya validados por el contrato del backend.
   */
  async agregarIndicacion(): Promise<void> {
    if (this.destruido || this.guardando || this.confirmando) return;

    if (!this.puedeGuardar) {
      this.avisarValidacion();
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

    const elegido = this.medicamentoElegido;
    const libre = this.medicamentoLibre.trim();
    const idEditado = this.indicacionEnEdicion;

    if (!elegido && !libre) return;

    if (idEditado !== null) {
      this.confirmando = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps
        .confirmarToast(
          `¿Está seguro de guardar los cambios de la indicación "${this.medicamento.trim()}"?`,
        )
        .catch(() => false);
      this.confirmando = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
    }

    const cuerpo: MedicamentoIndicacionRequest = {
      medicamentoLogId: elegido?.id ?? null,
      medicamentoLibre: elegido ? null : libre || null,
      presentacion: this.presentacionParaEnviar(elegido),
      cantidad: this.cantidad!,
      frecuencia: this.frecuencia!,
      duracion: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      tipoDuracion: this.aDuracionApi(this.duracionTipo as TipoDuracion),
      observaciones: this.observaciones.trim() || null,
      episodioId,
      usuarioId,
      fechaInicio: this.fechaInicio,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = (
      idEditado === null
        ? this.servicio.postIndicacion(cuerpo)
        : this.servicio.putIndicacion(idEditado, cuerpo)
    )
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          this.limpiarFormulario();
          this.popUps.exito(
            idEditado === null
              ? 'Indicación guardada exitosamente.'
              : 'Indicación actualizada exitosamente.',
          );
          this.cargarIndicaciones();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar la indicación. Intente nuevamente.');
        },
      });
  }

  /**
   * Confirma con el popup global y elimina la indicación. El backend hace la eliminación lógica y el
   * listado se recarga para reflejar el estado ELIMINADO.
   */
  async eliminarIndicacion(indicacion: IndicacionMedicamentoVista): Promise<void> {
    if (
      this.destruido ||
      this.eliminando ||
      this.guardando ||
      this.cambiandoEstado ||
      this.confirmando
    ) {
      return;
    }

    this.cerrarMenuIndicacion();

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar la indicación "${indicacion.nombre}"?`)
      .catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .eliminarIndicacion(indicacion.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          if (this.indicacionEnEdicion === indicacion.id) {
            this.limpiarFormulario();
          }
          this.popUps.exito('Indicación eliminada exitosamente.');
          this.cargarIndicaciones();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar la indicación. Intente nuevamente.');
        },
      });
  }

  /** Reactiva una indicación finalizada o eliminada. */
  async reactivarIndicacion(indicacion: IndicacionMedicamentoVista): Promise<void> {
    await this.cambiarEstadoIndicacion(indicacion, 'ACTIVO');
  }

  /** Cambia el estado de la indicación y recarga el listado del filtro vigente. */
  private async cambiarEstadoIndicacion(
    indicacion: IndicacionMedicamentoVista,
    estado: EstadoIndicacionMedicamento,
  ): Promise<void> {
    if (
      this.destruido ||
      this.cambiandoEstado ||
      this.guardando ||
      this.eliminando ||
      this.confirmando
    ) {
      return;
    }

    this.cerrarMenuIndicacion();

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(
        estado === 'ACTIVO'
          ? `¿Está seguro de reactivar la indicación "${indicacion.nombre}"?`
          : `¿Está seguro de finalizar la indicación "${indicacion.nombre}"?`,
      )
      .catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.cambiandoEstado = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .cambiarEstado(indicacion.id, estado)
      .pipe(
        finalize(() => {
          this.cambiandoEstado = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          this.popUps.exito(
            estado === 'ACTIVO'
              ? 'Indicación reactivada exitosamente.'
              : 'Indicación finalizada exitosamente.',
          );
          this.cargarIndicaciones();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo cambiar el estado de la indicación.');
        },
      });
  }

  // ------------------- APOYO -------------------
  /**
   * Unidad de la cantidad: la presentación del medicamento o la abreviatura de la unidad que se
   * guardó con la indicación; sin ninguna de las dos se usa «unidad»/«unidades».
   */
  private unidadDe(indicacion: IndicacionMedicamentoVista): string {
    return this.conciliarUnidad(indicacion.presentacion, indicacion.cantidad);
  }

  /** Texto que se guarda en la presentación: la presentación del medicamento o la abreviatura elegida. */
  private presentacionParaEnviar(elegido: MedicamentoCatalogoResponse | null): string | null {
    const unidad = this.unidadMedida.trim();
    if (!unidad) return elegido?.presentacion?.trim() || null;
    if (this.esGotas(unidad)) return 'gotas';

    return this.abreviaturasUnidad.get(unidad)?.trim() || unidad;
  }

  /** Nombre de la unidad del catálogo que corresponde a la presentación guardada, si la hay. */
  private unidadDesdePresentacion(presentacion: string): string {
    const valor = presentacion.trim().toLowerCase();
    if (!valor) return '';
    if (this.esGotas(valor)) return 'Gotas';

    for (const [nombre, abreviatura] of this.abreviaturasUnidad) {
      if (abreviatura.trim().toLowerCase() === valor) return nombre;
    }

    return '';
  }

  /** La unidad elegida representa gotas; es una opción del front que no está en el catálogo. */
  private esGotas(unidad: string): boolean {
    return this.singularizar(unidad.trim().toLowerCase()) === 'gota';
  }

  /**
   * Ajusta la primera palabra de la presentación al número indicado y conserva el resto del texto:
   * «1 tableta de 400 mg», «2 tabletas de 400 mg», «5 ml».
   */
  private conciliarUnidad(base: string, cantidad: number): string {
    const texto = base.trim();
    if (!texto) return cantidad === 1 ? 'unidad' : 'unidades';

    const [primera, ...resto] = texto.split(/\s+/);
    const unidad = primera.toLowerCase();

    // Las medidas abreviadas (mg, ml, g...) se escriben igual en singular y en plural
    if (unidad.length <= 2) return texto;

    const singular = this.singularizar(unidad);
    const ajustada = cantidad === 1 ? singular : this.pluralizar(singular);
    return [ajustada, ...resto].join(' ');
  }

  /** Singular de la unidad: «tabletas» → «tableta», «unidades» → «unidad». */
  private singularizar(unidad: string): string {
    if (unidad.endsWith('idades')) return unidad.slice(0, -2);
    if (unidad.endsWith('s') && !unidad.endsWith('sis')) return unidad.slice(0, -1);
    return unidad;
  }

  /** Plural de la unidad: «tableta» → «tabletas», «solución» → «soluciones». */
  private pluralizar(unidad: string): string {
    if (/[aeiou]$/.test(unidad)) return `${unidad}s`;
    if (unidad.endsWith('d')) return `${unidad}es`;
    if (unidad.endsWith('z')) return `${unidad.slice(0, -1)}ces`;
    if (unidad.endsWith('ón')) return `${unidad.slice(0, -2)}ones`;
    return unidad;
  }

  /** Traduce la indicación del backend a los datos que pinta la tarjeta. */
  private aVista(respuesta: MedicamentoIndicacionResponse): IndicacionMedicamentoVista {
    const fechaInicio = new Date(respuesta.fechaInicio || respuesta.fecha);

    return {
      id: respuesta.id,
      medicamentoLogId: respuesta.medicamentoLogId,
      nombre: respuesta.medicamento,
      medicamentoLibre: respuesta.medicamentoLibre ?? '',
      presentacion: respuesta.presentacion ?? '',
      cantidad: respuesta.cantidad,
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      observaciones: respuesta.observaciones ?? '',
      fechaInicio: respuesta.fechaInicio || respuesta.fecha,
      fecha: this.formatearFecha(fechaInicio),
      hora: this.formatearHora(fechaInicio),
      medico: respuesta.usuarioNombre,
      estado: this.aEstadoVista(respuesta.estado),
      tono: this.tonoDe(respuesta.estado),
    };
  }

  /** Medicamento mínimo para editar: conserva el id que exige el PUT aunque falten los detalles. */
  private catalogoMinimo(indicacion: IndicacionMedicamentoVista): MedicamentoCatalogoResponse {
    return {
      id: indicacion.medicamentoLogId ?? 0,
      nombre: indicacion.nombre,
      codigo: '',
      dosis: 0,
      marca: '',
      presentacion: indicacion.presentacion,
      viaAdministracion: '',
      unidadMedida: '',
      disponible: 0,
      disponibleConocido: false,
      estado: true,
    };
  }

  /** Convierte el tipo de duración del backend al valor del formulario. */
  private aDuracionVista(tipo: TipoDuracionApi): TipoDuracion {
    if (tipo === 'DOSIS_UNICA') return 'unica';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'indefinida';
    return 'dias';
  }

  /** Convierte el tipo de duración del formulario al enum del backend. */
  private aDuracionApi(tipo: TipoDuracion): TipoDuracionApi {
    if (tipo === 'unica') return 'DOSIS_UNICA';
    if (tipo === 'indefinida') return 'TIEMPO_INDEFINIDO';
    return 'DIAS';
  }

  /** Convierte el estado del backend al estado de la vista. */
  private aEstadoVista(estado: EstadoIndicacionMedicamento): EstadoIndicacionVista {
    if (estado === 'ACTIVO') return 'activa';
    if (estado === 'FINALIZADO') return 'finalizada';
    return 'eliminada';
  }

  /** Color del borde lateral de la tarjeta según el estado de la indicación. */
  private tonoDe(estado: EstadoIndicacionMedicamento): TonoIndicacion {
    if (estado === 'ACTIVO') return 'verde';
    if (estado === 'FINALIZADO') return 'naranja';
    return 'rojo';
  }

  /** Fecha de la indicación en el formato corto de la tarjeta (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora de la indicación en el formato de la tarjeta (HH:mm). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Fecha y hora en formato dd/MM/yyyy HH:mm. */
  private formatearFechaHora(fecha: Date): string {
    return `${this.formatearFecha(fecha)} ${this.formatearHora(fecha)}`;
  }

  /** Fecha y hora local en el formato del input datetime-local. */
  private fechaHoraLocalActual(): string {
    const ahora = new Date();
    const dosDigitos = (valor: number): string => `${valor}`.padStart(2, '0');

    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(
      ahora.getDate(),
    )}T${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`;
  }

  /** Recorta la fecha ISO al formato que acepta datetime-local. */
  private aFechaHoraInput(fecha: string): string {
    return fecha ? fecha.slice(0, 16) : this.fechaHoraLocalActual();
  }

  /** Avisa del campo que impide guardar cuando el formulario se envía incompleto. */
  private avisarValidacion(): void {
    if (!this.hayMedicamentoSeleccionado) {
      this.popUps.advertencia(
        'Busque y seleccione un medicamento del catálogo o indique uno no registrado.',
      );
      return;
    }
    if (!this.fechaInicio.trim()) {
      this.popUps.advertencia('Seleccione la fecha y hora de inicio.');
      return;
    }
    if (this.cantidad === null || !Number.isInteger(this.cantidad) || this.cantidad <= 0) {
      this.popUps.advertencia('La cantidad debe ser un número entero mayor a 0.');
      return;
    }
    if (this.frecuencia === null || !Number.isInteger(this.frecuencia) || this.frecuencia <= 0) {
      this.popUps.advertencia('La frecuencia debe ser un número entero mayor a 0.');
      return;
    }
    if (this.duracionTipo === '') {
      this.popUps.advertencia('Seleccione el tipo de duración.');
      return;
    }
    if (this.faltaDuracionEnDias) {
      this.popUps.advertencia('Indique cuántos días dura el tratamiento.');
      return;
    }
    if (this.observaciones.length > 2000) {
      this.popUps.advertencia('Las observaciones no pueden superar los 2000 caracteres.');
    }
  }

  /** Opción del filtro elegida en el listado. */
  private get filtroActual(): FiltroIndicacionVista {
    return (
      this.filtrosIndicacion.find((filtro) => filtro.id === this.filtroIndicacion) ??
      this.filtrosIndicacion[0]
    );
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
