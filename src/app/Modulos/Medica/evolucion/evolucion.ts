import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { DatosPaciente } from '../datos-paciente/datos-paciente';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Colores del acento de las tarjetas del historial de evoluciones. */
type TonoEvolucion = 'verde' | 'azul' | 'naranja' | 'morado';

/** Estado de la evolución registrada: las eliminadas se conservan para poder consultarlas. */
type EstadoEvolucion = 'activa' | 'eliminada';

/** Filtros del historial de evoluciones: las vigentes o las eliminadas. */
type FiltroEvolucion = 'activas' | 'eliminadas';

/** Evolución registrada en el episodio: quién la escribió, cuándo y su contenido clínico. */
interface EvolucionVista {
  id: number;
  medico: string;
  fecha: string;
  hora: string;
  /** Condición actual, cambios clínicos, hallazgos y respuesta al tratamiento. */
  evolucionClinica: string;
  /** Decisiones clínicas y plan de seguimiento. */
  planMedico: string;
  tono: TonoEvolucion;
  estado: EstadoEvolucion;
}

/** Opción del filtro del historial: la etiqueta que se pulsa y el estado que lista. */
interface FiltroEvolucionVista {
  id: FiltroEvolucion;
  etiqueta: string;
  /** Estado de las evoluciones que muestra la opción. */
  estado: EstadoEvolucion;
}

/**
 * Evolución médica del episodio: pantalla del módulo Médico con el registro de la evolución
 * (evolución clínica y plan médico) y el historial de las evoluciones registradas, que se listan
 * como las tarjetas del módulo: cada tarjeta muestra la evolución clínica y su plan médico, lleva
 * su menú de opciones para editarla o eliminarla y el historial se puede filtrar entre las
 * evoluciones activas y las eliminadas.
 */
@Component({
  selector: 'app-evolucion',
  imports: [FormsModule, DatosPaciente],
  templateUrl: './evolucion.html',
  styleUrl: './evolucion.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Evolucion {
  private readonly popUps = inject(PopUps);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Longitud máxima de cada cuadro del registro de la evolución. */
  readonly maxCaracteres = 1000;

  /** Campos del formulario del registro. */
  evolucionClinica = '';
  planMedico = '';

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

  /** Tarjeta del historial con su menú de opciones desplegado; null si no hay ninguna. */
  menuEvolucionAbierta: number | null = null;

  /** Evolución cuyos datos están cargados en el registro para corregirla; null al capturar una nueva. */
  evolucionEnEdicion: number | null = null;

  /** Colores con que se reparten los acentos de las tarjetas al registrar evoluciones. */
  private readonly tonos: TonoEvolucion[] = ['verde', 'azul', 'naranja', 'morado'];

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** MOCK: historial de evoluciones del episodio, de la más reciente a la más antigua. */
  evoluciones: EvolucionVista[] = [
    {
      id: 1,
      medico: 'Dr. Juan Pérez',
      fecha: '12/10/2026',
      hora: '10:30',
      evolucionClinica:
        'Paciente con disminución del dolor abdominal, sin nuevos episodios de vómitos. ' +
        'Presenta mejoría clínica.',
      planMedico:
        'Continuar con el esquema indicado, mantener la hidratación y vigilar la respuesta al ' +
        'tratamiento.',
      tono: 'morado',
      estado: 'activa',
    },
    {
      id: 2,
      medico: 'Dra. Ana López',
      fecha: '11/10/2026',
      hora: '09:15',
      evolucionClinica:
        'Paciente persiste con molestias abdominales. Se realiza valoración de seguimiento y ' +
        'respuesta al tratamiento.',
      planMedico: 'Mantener analgesia, control de signos vitales y valorar nuevos estudios.',
      tono: 'azul',
      estado: 'activa',
    },
    {
      id: 3,
      medico: 'Dr. Juan Pérez',
      fecha: '10/10/2026',
      hora: '08:00',
      evolucionClinica:
        'Paciente ingresa con dolor abdominal y vómitos. Se inicia hidratación y analgesia.',
      planMedico: 'Solicitar hemograma, control de signos vitales y reevaluar en cuatro horas.',
      tono: 'naranja',
      estado: 'eliminada',
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- FILTROS DEL HISTORIAL -------------------
  /** Filtro elegido en el historial; abre mostrando las evoluciones vigentes. */
  filtroEvolucion: FiltroEvolucion = 'activas';

  /** Opciones del filtro del historial: las evoluciones vigentes y las eliminadas. */
  readonly filtrosEvolucion: FiltroEvolucionVista[] = [
    { id: 'activas', etiqueta: 'Activas', estado: 'activa' },
    { id: 'eliminadas', etiqueta: 'Eliminadas', estado: 'eliminada' },
  ];

  /** Muestra las evoluciones del estado elegido y suelta lo que dependía del listado anterior. */
  seleccionarFiltroEvolucion(filtro: FiltroEvolucion): void {
    this.filtroEvolucion = filtro;
    this.cerrarMenuEvolucion();

    const sigueEnElHistorial = this.evolucionesFiltradas.some(
      (evolucion) => evolucion.id === this.evolucionEnEdicion,
    );

    // La evolución en edición no puede quedar fuera del listado visible
    if (this.evolucionEnEdicion !== null && !sigueEnElHistorial) {
      this.cancelarCaptura();
    }
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Evoluciones que muestra el historial con el filtro elegido. */
  get evolucionesFiltradas(): EvolucionVista[] {
    const estado = this.filtroActualEvolucion.estado;

    return this.evoluciones.filter((evolucion) => evolucion.estado === estado);
  }

  /** Texto del listado cuando el filtro elegido no tiene evoluciones. */
  get mensajeSinEvoluciones(): string {
    const filtro = this.filtroActualEvolucion;

    return filtro.estado === 'eliminada'
      ? 'No hay evoluciones eliminadas en el episodio.'
      : 'Aún no hay evoluciones registradas para el paciente.';
  }

  /** Solo se puede guardar cuando la evolución clínica y el plan médico tienen contenido. */
  get puedeGuardar(): boolean {
    return this.evolucionClinica.trim().length > 0 && this.planMedico.trim().length > 0;
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /**
   * Abre o cierra la ficha con los datos del paciente desde la pestaña lateral del bloque
   * compartido, igual que en evaluación clínica y en indicaciones médicas. Al abrirla se muestran
   * los datos completos para que el usuario vea la información de contexto aunque la hubiera
   * plegado antes.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

  /** Deja el formulario vacío para capturar una evolución nueva. */
  limpiarFormulario(): void {
    this.evolucionClinica = '';
    this.planMedico = '';
  }

  /**
   * MOCK: registra la evolución escrita. Si hay una evolución cargada para corregir se reemplazan
   * sus datos en su lugar, conservando fecha, hora, médico y color; si no, se agrega al inicio del
   * historial, de modo que la más reciente queda a la vista. La fecha, la hora y el médico reales
   * los aportará el backend en la fase de integración.
   */
  guardarEvolucion(): void {
    if (!this.puedeGuardar) {
      return;
    }

    const evolucionClinica = this.evolucionClinica.trim();
    const planMedico = this.planMedico.trim();

    if (this.evolucionEnEdicion !== null) {
      const idEditado = this.evolucionEnEdicion;

      this.evoluciones = this.evoluciones.map((evolucion) =>
        evolucion.id === idEditado ? { ...evolucion, evolucionClinica, planMedico } : evolucion,
      );
      this.cancelarCaptura();
      return;
    }

    const ultimoId = this.evoluciones.reduce(
      (mayor, evolucion) => Math.max(mayor, evolucion.id),
      0,
    );
    const tono = this.tonos[this.evoluciones.length % this.tonos.length];

    this.evoluciones = [
      {
        id: ultimoId + 1,
        medico: 'Dr. Juan Pérez',
        fecha: '12/10/2026',
        hora: '10:30',
        evolucionClinica,
        planMedico,
        tono,
        estado: 'activa',
      },
      ...this.evoluciones,
    ];

    // La evolución registrada es vigente: el historial vuelve a las activas para dejarla a la vista
    this.seleccionarFiltroEvolucion('activas');
    this.limpiarFormulario();
  }

  /** Descarta lo capturado y deja el registro listo para escribir una evolución nueva. */
  cancelarCaptura(): void {
    this.evolucionEnEdicion = null;
    this.limpiarFormulario();
  }

  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuEvolucion(id: number): void {
    this.menuEvolucionAbierta = this.menuEvolucionAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuEvolucion(): void {
    this.menuEvolucionAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto, como en el listado de indicaciones. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuEvolucionAbierta === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.evolucion-card');
    // Cada tarjeta del historial lleva el identificador de su evolución
    if (tarjeta?.dataset['evolucionId'] !== String(this.menuEvolucionAbierta)) {
      this.cerrarMenuEvolucion();
    }
  }

  /** Carga en el registro la evolución elegida para corregirla. */
  editarEvolucion(evolucion: EvolucionVista): void {
    this.evolucionEnEdicion = evolucion.id;
    this.evolucionClinica = evolucion.evolucionClinica;
    this.planMedico = evolucion.planMedico;
  }

  /**
   * MOCK: da de baja la evolución confirmada desde el popup global. La maqueta la marca como
   * eliminada y no la borra, de modo que sigue consultable con el filtro de eliminadas; la baja
   * real la hará el servicio de evoluciones en la fase de integración.
   */
  async eliminarEvolucion(evolucion: EvolucionVista): Promise<void> {
    this.cerrarMenuEvolucion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar la evolución del ${evolucion.fecha}?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    this.evoluciones = this.evoluciones.map((registrada) =>
      registrada.id === evolucion.id ? { ...registrada, estado: 'eliminada' } : registrada,
    );

    if (this.evolucionEnEdicion === evolucion.id) {
      this.cancelarCaptura();
    }
  }

  // ------------------- AUXILIARES INTERNOS -------------------
  /** Opción del filtro del historial elegida en el listado. */
  private get filtroActualEvolucion(): FiltroEvolucionVista {
    return (
      this.filtrosEvolucion.find((filtro) => filtro.id === this.filtroEvolucion) ??
      this.filtrosEvolucion[0]
    );
  }
}
