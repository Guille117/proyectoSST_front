import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { AuthService } from '../../Auth/data/auth-service';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la integración. */
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
  nombre: string;
  cantidad: number;
}

/** Procedimiento del listado y de las tarjetas de resumen. */
interface ProcedimientoVista {
  id: number;
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
  imports: [FormsModule, TabSwitch],
  templateUrl: './procedimiento-medico.html',
  styleUrl: './procedimiento-medico.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class ProcedimientoMedico {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Opción del rail que se muestra en el área central y en el panel derecho. */
  seccionActiva: SeccionProcedimiento = 'registrar';

  /** Filtro de las tarjetas de procedimientos realizados. */
  filtroProcedimiento: FiltroProcedimiento = 'todos';

  /** Campos del formulario de registro. */
  tipoProcedimiento: number | null = null;
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

  // ------------------- MOCK: datos temporales para diseño -------------------
  readonly secciones: SeccionVista[] = [
    { id: 'registrar', titulo: 'Registrar procedimiento', icono: 'bi-clipboard2-pulse' },
    { id: 'realizados', titulo: 'Procedimientos realizados', icono: 'bi-list-check' },
  ];

  readonly filtrosProcedimiento: FiltroProcedimientoVista[] = [
    { id: 'todos', etiqueta: 'Todos' },
    { id: 'realizados', etiqueta: 'Realizados' },
    { id: 'pendientes', etiqueta: 'Pendientes' },
    { id: 'eliminados', etiqueta: 'Eliminados' },
  ];

  readonly tiposProcedimiento: TipoProcedimientoVista[] = [
    { id: 1, nombre: 'Curación de herida' },
    { id: 2, nombre: 'Sutura' },
    { id: 3, nombre: 'Cateterismo' },
    { id: 4, nombre: 'Drenaje de absceso' },
    { id: 5, nombre: 'Biopsia' },
  ];

  /** MOCK: medicamentos disponibles para el procedimiento. */
  readonly medicamentos: RecursoDisponible[] = [
    { id: 1, nombre: 'Amoxicilina Bayer tabletas de 500 mg', disponible: 20 },
    { id: 2, nombre: 'Paracetamol Genfar tabletas de 500 mg', disponible: 15 },
    { id: 3, nombre: 'Ibuprofeno MK tabletas de 400 mg', disponible: 8 },
    { id: 4, nombre: 'Metoclopramida Genfar solución inyectable de 10 mg', disponible: 12 },
  ];

  /** MOCK: insumos disponibles para el procedimiento. */
  readonly insumos: RecursoDisponible[] = [
    { id: 1, nombre: 'Gasas estériles 10x10', disponible: 30 },
    { id: 2, nombre: 'Guantes de nitrilo talla M', disponible: 50 },
    { id: 3, nombre: 'Jeringa 5 ml', disponible: 40 },
    { id: 4, nombre: 'Sutura absorbible 3-0', disponible: 18 },
  ];

  /** MOCK: procedimientos registrados en el episodio. */
  procedimientos: ProcedimientoVista[] = [
    {
      id: 1,
      tipo: 'Curación de herida',
      descripcion: 'Limpieza y cambio de vendaje de la herida quirúrgica.',
      resultado: 'Herida sin signos de infección, bordes limpios.',
      inicio: '2026-10-18T09:00',
      fin: '2026-10-18T09:30',
      profesional: 'Dra. Ana López',
      estado: 'realizado',
      recursos: [
        { tipo: 'medicamento', nombre: 'Amoxicilina Bayer tabletas de 500 mg', cantidad: 2 },
        { tipo: 'insumo', nombre: 'Gasas estériles 10x10', cantidad: 4 },
      ],
    },
    {
      id: 2,
      tipo: 'Sutura',
      descripcion: 'Sutura de herida en el antebrazo derecho.',
      resultado: '',
      inicio: '2026-10-19T11:00',
      fin: '2026-10-19T12:00',
      profesional: 'Dr. Carlos Méndez',
      estado: 'pendiente',
      recursos: [],
    },
    {
      id: 3,
      tipo: 'Drenaje de absceso',
      descripcion: 'Drenaje de absceso en la región glútea.',
      resultado: 'Se drena material purulento; paciente estable.',
      inicio: '2026-10-17T15:30',
      fin: '2026-10-17T16:10',
      profesional: 'Dra. Ana López',
      estado: 'realizado',
      recursos: [
        { tipo: 'insumo', nombre: 'Guantes de nitrilo talla M', cantidad: 2 },
        { tipo: 'insumo', nombre: 'Jeringa 5 ml', cantidad: 1 },
      ],
    },
    {
      id: 4,
      tipo: 'Biopsia',
      descripcion: 'Toma de muestra para estudio histopatológico.',
      resultado: '',
      inicio: '2026-10-20T08:00',
      fin: '2026-10-20T08:40',
      profesional: 'Dr. Carlos Méndez',
      estado: 'pendiente',
      recursos: [],
    },
    {
      id: 5,
      tipo: 'Cateterismo',
      descripcion: 'Colocación de catéter venoso central.',
      resultado: 'Procedimiento cancelado por decisión del paciente.',
      inicio: '2026-10-16T10:00',
      fin: '',
      profesional: 'Dr. Carlos Méndez',
      estado: 'eliminado',
      recursos: [],
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  get esRegistrar(): boolean {
    return this.seccionActiva === 'registrar';
  }

  get recursosDisponibles(): RecursoDisponible[] {
    return this.tipoRecurso === 'medicamento' ? this.medicamentos : this.insumos;
  }

  get etiquetaRecurso(): string {
    return this.tipoRecurso === 'medicamento' ? 'medicamento' : 'insumo';
  }

  get procedimientosFiltrados(): ProcedimientoVista[] {
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
      this.tipoProcedimiento !== null &&
      this.descripcion.trim().length > 0 &&
      this.fechasValidas
    );
  }

  get cantidadMaximaRecurso(): number {
    const seleccionado = this.recursoSeleccionado;
    if (!seleccionado) return 0;

    const existente = this.buscarRecursoAgregado(seleccionado.nombre);
    return Math.max(0, seleccionado.disponible - (existente?.cantidad ?? 0));
  }

  get puedeAgregarRecurso(): boolean {
    return (
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

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Cambia la opción del rail y mantiene una tarjeta seleccionada en el listado. */
  seleccionarSeccion(id: SeccionProcedimiento): void {
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
    const tipo = this.tiposProcedimiento.find((opcion) => opcion.nombre === procedimiento.tipo);

    this.tipoProcedimiento = tipo?.id ?? null;
    this.descripcion = procedimiento.descripcion;
    this.resultado = procedimiento.resultado;
    this.inicio = procedimiento.inicio;
    this.fin = procedimiento.fin;
    this.recursosAgregados = [...procedimiento.recursos];
    this.cancelarSeleccionRecurso();
    this.procedimientoEnEdicion = procedimiento.id;
    this.seccionActiva = 'registrar';
    this.cerrarMenuProcedimiento();
  }

  /** Marca el procedimiento como eliminado después de confirmarlo. */
  async eliminarProcedimiento(procedimiento: ProcedimientoVista): Promise<void> {
    this.cerrarMenuProcedimiento();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el procedimiento "${procedimiento.tipo}"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    this.procedimientos = this.procedimientos.map<ProcedimientoVista>((registrado) =>
      registrado.id === procedimiento.id
        ? { ...registrado, estado: 'eliminado' }
        : registrado,
    );

    if (this.procedimientoEnEdicion === procedimiento.id) {
      this.limpiarFormulario();
      this.limpiarRecursos();
    }

    this.asegurarProcedimientoSeleccionado();
    this.popUps.exito('Procedimiento eliminado exitosamente.');
  }

  /** Registra el procedimiento con sus fechas y los recursos agregados. */
  registrarProcedimiento(): void {
    if (!this.puedeRegistrarProcedimiento) {
      this.popUps.advertencia(
        'Complete el tipo, la descripción y la fecha de inicio; la fecha de fin, si se indica, no puede ser anterior al inicio.',
      );
      return;
    }

    const tipo = this.tiposProcedimiento.find(
      (opcion) => opcion.id === this.tipoProcedimiento,
    );
    if (!tipo) return;

    const idEdicion = this.procedimientoEnEdicion;
    const registroExistente =
      idEdicion === null
        ? null
        : this.procedimientos.find((procedimiento) => procedimiento.id === idEdicion);

    if (registroExistente) {
      const actualizado: ProcedimientoVista = {
        ...registroExistente,
        tipo: tipo.nombre,
        descripcion: this.descripcion.trim(),
        resultado: this.resultado.trim(),
        inicio: this.inicio,
        fin: this.fin,
        estado: this.estadoSegunDatos(registroExistente.estado),
        recursos: [...this.recursosAgregados],
      };

      this.procedimientos = this.procedimientos.map((procedimiento) =>
        procedimiento.id === registroExistente.id ? actualizado : procedimiento,
      );
      this.filtroProcedimiento = this.filtroDeEstado(actualizado.estado);
      this.limpiarFormulario();
      this.limpiarRecursos();
      this.seccionActiva = 'realizados';
      this.procedimientoSeleccionado = actualizado.id;
      this.popUps.exito('Procedimiento actualizado exitosamente.');
      return;
    }

    const nuevo: ProcedimientoVista = {
      id: this.siguienteIdProcedimiento(),
      tipo: tipo.nombre,
      descripcion: this.descripcion.trim(),
      resultado: this.resultado.trim(),
      inicio: this.inicio,
      fin: this.fin,
      profesional: this.profesionalActual(),
      estado: this.estadoSegunDatos(null),
      recursos: [...this.recursosAgregados],
    };

    this.procedimientos = [nuevo, ...this.procedimientos];
    this.limpiarFormulario();
    this.limpiarRecursos();
    this.filtroProcedimiento = 'todos';
    this.seccionActiva = 'realizados';
    this.procedimientoSeleccionado = nuevo.id;
    this.popUps.exito('Procedimiento registrado exitosamente.');
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

  /** Busca en el catálogo mock del tipo de recurso activo. */
  buscarRecursos(): void {
    const termino = this.normalizarTexto(this.textoBusquedaRecurso);

    this.busquedaRecursoRealizada = true;
    this.recursoSeleccionado = null;
    this.cantidadRecurso = null;

    this.recursosEncontrados = this.recursosDisponibles.filter(
      (recurso) =>
        recurso.disponible > 0 &&
        (!termino || this.normalizarTexto(recurso.nombre).includes(termino)),
    );
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

    const existente = this.buscarRecursoAgregado(seleccionado.nombre);

    if (existente) {
      this.recursosAgregados = this.recursosAgregados.map((recurso) =>
        recurso === existente ? { ...recurso, cantidad: recurso.cantidad + cantidad } : recurso,
      );
    } else {
      this.recursosAgregados = [
        ...this.recursosAgregados,
        { tipo: this.tipoRecurso, nombre: seleccionado.nombre, cantidad },
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
  /** Un procedimiento solo es realizado si tiene resultado y fecha de finalización. */
  private estadoSegunDatos(estadoOriginal: EstadoProcedimiento | null): EstadoProcedimiento {
    if (estadoOriginal === 'eliminado') return 'eliminado';

    return this.resultado.trim().length > 0 && this.fin ? 'realizado' : 'pendiente';
  }

  /** Filtro que corresponde al estado del procedimiento. */
  private filtroDeEstado(estado: EstadoProcedimiento): FiltroProcedimiento {
    if (estado === 'realizado') return 'realizados';
    if (estado === 'pendiente') return 'pendientes';
    return 'eliminados';
  }

  /** Nombre del profesional de la sesión que registra el procedimiento. */
  private profesionalActual(): string {
    return this.authService.currentUser()?.nombreCompleto?.trim() || 'Médico de turno';
  }

  /** Deja el formulario listo para un procedimiento nuevo. */
  private limpiarFormulario(): void {
    this.tipoProcedimiento = null;
    this.descripcion = '';
    this.resultado = '';
    this.inicio = '';
    this.fin = '';
    this.procedimientoEnEdicion = null;
  }

  /** Limpia la búsqueda y la lista de recursos del procedimiento actual. */
  private limpiarRecursos(): void {
    this.recursosAgregados = [];
    this.cancelarSeleccionRecurso();
  }

  /** Nombre siguiente para el procedimiento nuevo. */
  private siguienteIdProcedimiento(): number {
    const mayor = this.procedimientos.reduce(
      (maximo, procedimiento) => Math.max(maximo, procedimiento.id),
      0,
    );

    return mayor + 1;
  }

  /** El recurso ya agregado del mismo tipo, si existe. */
  private buscarRecursoAgregado(nombre: string): RecursoUtilizado | undefined {
    return this.recursosAgregados.find(
      (recurso) => recurso.tipo === this.tipoRecurso && recurso.nombre === nombre,
    );
  }

  /** Deja seleccionada una tarjeta válida cuando el filtro o la sección cambian. */
  private asegurarProcedimientoSeleccionado(): void {
    const lista = this.procedimientosFiltrados;

    if (!lista.some((procedimiento) => procedimiento.id === this.procedimientoSeleccionado)) {
      this.procedimientoSeleccionado = lista[0]?.id ?? null;
    }
  }

  /** Texto sin mayúsculas ni acentos para comparar la búsqueda con el catálogo. */
  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
