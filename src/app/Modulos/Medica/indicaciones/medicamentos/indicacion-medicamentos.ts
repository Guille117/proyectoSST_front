import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, Subscription, TimeoutError } from 'rxjs';
import { Paginacion } from '../../../../shared/paginacion/paginacion';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import {
  DuracionVista,
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias as calcularFaltaDuracion,
  textoDuracion as describirDuracion,
} from '../data/duracion';
import {
  EstadoIndicacionMedicamento,
  MedicamentoCatalogoResponse,
  MedicamentoIndicacionRequest,
  MedicamentoIndicacionResponse,
  TipoDuracionApi,
} from './data/medicamentoInterfaz';
import { MedicamentoIndicacionService } from './data/medicamento-service';

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
  medicamentoLogId: number;
  nombre: string;
  /** Cantidad indicada; el contrato la exige como entero mayor a 0. */
  cantidad: number;
  /** Frecuencia indicada; el contrato la exige como entero mayor a 0. */
  frecuencia: number;
  observaciones: string;
  fecha: string;
  hora: string;
  medico: string;
  estado: EstadoIndicacionVista;
  tono: TonoIndicacion;
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
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionCatalogo?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario de la indicación. */
  medicamento = '';
  cantidad: number | null = null;
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
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

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  eliminando = false;
  cambiandoEstado = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

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
    this.cargarIndicaciones();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionCatalogo?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay un medicamento escrito. */
  get hayMedicamento(): boolean {
    return this.medicamento.trim().length > 0;
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
      this.medicamentoElegido !== null &&
      !this.faltaDuracionEnDias &&
      this.duracionTipo !== '' &&
      this.cantidad !== null &&
      Number.isInteger(this.cantidad) &&
      this.cantidad > 0 &&
      this.frecuencia !== null &&
      Number.isInteger(this.frecuencia) &&
      this.frecuencia > 0 &&
      this.observaciones.length <= 2000 &&
      !this.guardando
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
    const elegido = this.medicamentoElegido;
    if (!elegido) return '';

    const descripcion = this.descripcionMedicamento(elegido);
    return elegido.viaAdministracion
      ? `${descripcion}, administración ${elegido.viaAdministracion.toLowerCase()}`
      : descripcion;
  }

  /** Texto de la tabla de resultados cuando la búsqueda no encuentra medicamentos en el catálogo. */
  get mensajeSinMedicamentosEncontrados(): string {
    const termino = this.medicamento.trim();

    return termino
      ? `No se encontraron medicamentos que coincidan con «${termino}».`
      : 'El catálogo no tiene medicamentos para mostrar.';
  }

  /** Texto de la duración que muestra la tarjeta. */
  textoDuracion(registro: DuracionVista): string {
    return describirDuracion(registro);
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
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
    this.medicamentoElegido = opcion;
  }

  /** Devuelve el formulario al buscador para elegir otro medicamento en lugar del elegido. */
  cambiarMedicamento(): void {
    this.medicamento = '';
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

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el formulario la indicación elegida para corregirla. */
  editarIndicacion(indicacion: IndicacionMedicamentoVista): void {
    if (this.guardando || this.eliminando || this.cambiandoEstado) return;

    this.cerrarMenuIndicacion();
    this.indicacionEnEdicion = indicacion.id;
    this.medicamentoElegido = this.catalogoMinimo(indicacion);
    this.medicamento = indicacion.nombre;
    this.cantidad = indicacion.cantidad;
    this.frecuencia = indicacion.frecuencia;
    this.duracionTipo = indicacion.duracionTipo;
    this.duracionCantidad = indicacion.duracionCantidad;
    this.observaciones = indicacion.observaciones;
    this.busquedaMedicamentoRealizada = false;
    this.medicamentosEncontrados = [];
    this.paginaMedicamentos = 1;
  }

  /** Deja el formulario listo para capturar una indicación nueva. */
  limpiarFormulario(): void {
    this.medicamento = '';
    this.cantidad = null;
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.observaciones = '';
    this.indicacionEnEdicion = null;
    this.cerrarResultadosMedicamento();
  }

  /**
   * Crea la indicación o actualiza la que está en edición. El cuerpo lleva el episodio activo, el
   * usuario de la sesión y los valores ya validados por el contrato del backend.
   */
  agregarIndicacion(): void {
    if (this.destruido || this.guardando) return;

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
    const idEditado = this.indicacionEnEdicion;

    if (!elegido) return;

    const cuerpo: MedicamentoIndicacionRequest = {
      medicamentoLogId: elegido.id,
      cantidad: this.cantidad!,
      frecuencia: this.frecuencia!,
      duracion: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      tipoDuracion: this.aDuracionApi(this.duracionTipo as TipoDuracion),
      observaciones: this.observaciones.trim() || null,
      episodioId,
      usuarioId,
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
    if (this.destruido || this.eliminando || this.guardando || this.cambiandoEstado) return;

    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar la indicación "${indicacion.nombre}"?`)
      .catch(() => false);

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

  /** Finaliza la indicación activa usando el cambio de estado del backend. */
  finalizarIndicacion(indicacion: IndicacionMedicamentoVista): void {
    this.cambiarEstadoIndicacion(indicacion, 'FINALIZADO');
  }

  /** Reactiva una indicación finalizada o eliminada. */
  reactivarIndicacion(indicacion: IndicacionMedicamentoVista): void {
    this.cambiarEstadoIndicacion(indicacion, 'ACTIVO');
  }

  /** Cambia el estado de la indicación y recarga el listado del filtro vigente. */
  private cambiarEstadoIndicacion(
    indicacion: IndicacionMedicamentoVista,
    estado: EstadoIndicacionMedicamento,
  ): void {
    if (this.destruido || this.cambiandoEstado || this.guardando || this.eliminando) return;

    this.cerrarMenuIndicacion();
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
  /** Traduce la indicación del backend a los datos que pinta la tarjeta. */
  private aVista(respuesta: MedicamentoIndicacionResponse): IndicacionMedicamentoVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      medicamentoLogId: respuesta.medicamentoLogId,
      nombre: respuesta.medicamento,
      cantidad: respuesta.cantidad,
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      observaciones: respuesta.observaciones ?? '',
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      medico: respuesta.usuarioNombre,
      estado: this.aEstadoVista(respuesta.estado),
      tono: this.tonoDe(respuesta.estado),
    };
  }

  /** Medicamento mínimo para editar: conserva el id que exige el PUT aunque falten los detalles. */
  private catalogoMinimo(indicacion: IndicacionMedicamentoVista): MedicamentoCatalogoResponse {
    return {
      id: indicacion.medicamentoLogId,
      nombre: indicacion.nombre,
      codigo: '',
      dosis: 0,
      marca: '',
      presentacion: '',
      viaAdministracion: '',
      unidadMedida: '',
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

  /** Avisa del campo que impide guardar cuando el formulario se envía incompleto. */
  private avisarValidacion(): void {
    if (this.medicamentoElegido === null) {
      this.popUps.advertencia('Busque y seleccione un medicamento del catálogo.');
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
