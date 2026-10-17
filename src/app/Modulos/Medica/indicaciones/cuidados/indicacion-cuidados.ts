import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import {
  DuracionVista,
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias as calcularFaltaDuracion,
  textoDuracion as describirDuracion,
} from '../data/duracion';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Colores de acento lateral de la tarjeta del cuidado; describen su estado en el listado. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Estados en los que puede quedar un cuidado indicado. */
type EstadoCuidado = 'enProceso' | 'completado' | 'eliminado';

/** Filtros del listado de cuidados: un estado concreto o «todas» los cuidados vigentes. */
type FiltroCuidado = 'todas' | 'completados' | 'enProceso' | 'eliminados';

/** Cuidado indicado al paciente: su nombre, su frecuencia, su duración y sus observaciones. */
interface CuidadoVista extends DuracionVista {
  id: number;
  nombre: string;
  /** Frecuencia indicada; el formulario solo admite números. */
  frecuencia: number | null;
  observaciones: string;
  fecha: string;
  hora: string;
  medico: string;
  /** Estado del registro: los eliminados solo se listan con el filtro «Eliminadas». */
  estado: EstadoCuidado;
}

/** Opción del filtro que decide qué cuidados se muestran en el listado. */
interface FiltroCuidadoVista {
  id: FiltroCuidado;
  etiqueta: string;
  /** Estado que muestra la opción; null cuando muestra los cuidados vigentes. */
  estado: EstadoCuidado | null;
}

/**
 * Sección de cuidados de las indicaciones médicas: registro del cuidado con su frecuencia, su
 * duración y sus observaciones, y listado de los cuidados indicados en el episodio.
 */
@Component({
  selector: 'app-indicacion-cuidados',
  imports: [FormsModule, NgClass],
  templateUrl: './indicacion-cuidados.html',
  styleUrl: './indicacion-cuidados.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class IndicacionCuidados {
  private readonly popUps = inject(PopUps);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario del cuidado: nombre, frecuencia, duración y observaciones. */
  nombreCuidado = '';
  frecuenciaCuidado: number | null = null;
  duracionTipoCuidado: TipoDuracion | '' = '';
  duracionCantidadCuidado: number | null = null;
  observacionesCuidado = '';

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Cuidado cuyos datos están cargados en el formulario; null al capturar un cuidado nuevo. */
  cuidadoEnEdicion: number | null = null;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

  /** Colores de acento de las tarjetas de cuidados: el borde describe el estado del cuidado. */
  private readonly tonosCuidado: Record<EstadoCuidado, TonoIndicacion> = {
    completado: 'verde',
    enProceso: 'naranja',
    eliminado: 'rojo',
  };

  /** MOCK: cuidados indicados en el episodio actual, con los estados del filtro del listado. */
  cuidados: CuidadoVista[] = [
    {
      id: 1,
      nombre: 'Cambio de posición',
      frecuencia: 2,
      duracionTipo: 'dias',
      duracionCantidad: 5,
      observaciones: 'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
      fecha: '10/10/2026',
      hora: '09:15',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 2,
      nombre: 'Control de signos vitales',
      frecuencia: 4,
      duracionTipo: 'dias',
      duracionCantidad: 3,
      observaciones: 'Registrar la saturación y la temperatura en cada control.',
      fecha: '10/10/2026',
      hora: '09:20',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 3,
      nombre: 'Balance hídrico estricto',
      frecuencia: 24,
      duracionTipo: 'dias',
      duracionCantidad: 2,
      observaciones: 'Medir la diuresis y anotar los ingresos de cada turno.',
      fecha: '10/10/2026',
      hora: '09:24',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 4,
      nombre: 'Curación de herida',
      frecuencia: 12,
      duracionTipo: 'dias',
      duracionCantidad: 5,
      observaciones: 'Lavar con solución fisiológica y cubrir con gasa estéril.',
      fecha: '10/10/2026',
      hora: '09:28',
      medico: 'Dr. Gómez',
      estado: 'completado',
    },
    {
      id: 5,
      nombre: 'Vigilancia de diuresis',
      frecuencia: 8,
      duracionTipo: 'indefinida',
      duracionCantidad: null,
      observaciones: 'Cuidado duplicado en la orden.',
      fecha: '09/10/2026',
      hora: '16:40',
      medico: 'Dra. Herrera',
      estado: 'eliminado',
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de cuidados; abre mostrando los cuidados vigentes. */
  filtroCuidado: FiltroCuidado = 'todas';

  /** Opciones del filtro de cuidados: sus estados y «Todas», que deja fuera los eliminados. */
  readonly filtrosCuidado: FiltroCuidadoVista[] = [
    { id: 'todas', etiqueta: 'Todas', estado: null },
    { id: 'completados', etiqueta: 'Completadas', estado: 'completado' },
    { id: 'enProceso', etiqueta: 'En proceso', estado: 'enProceso' },
    { id: 'eliminados', etiqueta: 'Eliminadas', estado: 'eliminado' },
  ];

  /** Muestra los cuidados del estado elegido y suelta lo que dependía del listado anterior. */
  seleccionarFiltroCuidado(filtro: FiltroCuidado): void {
    this.filtroCuidado = filtro;
    this.cerrarMenuIndicacion();

    const sigueEnElListado = this.cuidadosFiltrados.some(
      (cuidado) => cuidado.id === this.cuidadoEnEdicion,
    );

    // El cuidado en edición no puede quedar fuera del listado visible
    if (this.cuidadoEnEdicion !== null && !sigueEnElListado) {
      this.limpiarFormularioCuidado();
    }
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar del cuidado se habilita con el nombre del cuidado escrito. */
  get hayCuidado(): boolean {
    return this.nombreCuidado.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el cuidado. */
  get faltaDuracionEnDiasCuidado(): boolean {
    return calcularFaltaDuracion(this.duracionTipoCuidado, this.duracionCantidadCuidado);
  }

  /** El botón Guardar se habilita con el nombre del cuidado y la duración en días resuelta. */
  get puedeGuardarCuidado(): boolean {
    return this.hayCuidado && !this.faltaDuracionEnDiasCuidado;
  }

  /** Cuidados que muestra el listado con el filtro elegido; «Todas» deja fuera los eliminados. */
  get cuidadosFiltrados(): CuidadoVista[] {
    const estado = this.filtroActualCuidado.estado;

    return this.cuidados.filter((cuidado) =>
      estado === null ? cuidado.estado !== 'eliminado' : cuidado.estado === estado,
    );
  }

  /**
   * Texto del listado cuando el filtro elegido no tiene cuidados. No se concuerda con la etiqueta
   * del filtro porque «cuidado» es masculino y las etiquetas del listado son «Completadas» y
   * «Eliminadas», tomadas del listado de indicaciones.
   */
  get mensajeSinCuidados(): string {
    const filtro = this.filtroActualCuidado;

    return filtro.estado === null
      ? 'Aún no hay cuidados indicados para el paciente.'
      : `No hay cuidados con el filtro «${filtro.etiqueta}».`;
  }

  /** Texto de la duración que muestra la tarjeta. */
  textoDuracion(registro: DuracionVista): string {
    return describirDuracion(registro);
  }

  /** Color del borde lateral de la tarjeta del cuidado: describe su estado en el listado. */
  tonoCuidado(cuidado: CuidadoVista): TonoIndicacion {
    return this.tonosCuidado[cuidado.estado];
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
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
    // Cada tarjeta del listado lleva el identificador de su cuidado
    const tarjetaAbierta = tarjeta?.dataset['cuidadoId'];

    if (tarjetaAbierta !== String(this.menuIndicacionAbierta)) {
      this.cerrarMenuIndicacion();
    }
  }

  /** Carga en el formulario el cuidado elegido para corregirlo. */
  editarCuidado(cuidado: CuidadoVista): void {
    this.cuidadoEnEdicion = cuidado.id;
    this.nombreCuidado = cuidado.nombre;
    this.frecuenciaCuidado = cuidado.frecuencia;
    this.duracionTipoCuidado = cuidado.duracionTipo;
    this.duracionCantidadCuidado = cuidado.duracionCantidad;
    this.observacionesCuidado = cuidado.observaciones;
  }

  /** Deja el formulario del cuidado listo para capturar uno nuevo. */
  limpiarFormularioCuidado(): void {
    this.nombreCuidado = '';
    this.frecuenciaCuidado = null;
    this.duracionTipoCuidado = '';
    this.duracionCantidadCuidado = null;
    this.observacionesCuidado = '';
    this.cuidadoEnEdicion = null;
  }

  /**
   * MOCK: registra el cuidado escrito. Si hay una tarjeta en edición se reemplazan sus datos
   * conservando la fecha, la hora, el médico y el estado originales; si no, se agrega al final del
   * listado y queda en proceso. En ambos casos el formulario queda limpio para la siguiente captura.
   * La fecha, la hora y el médico reales los aportará el backend en la integración.
   */
  agregarCuidado(): void {
    const nombre = this.nombreCuidado.trim();

    if (!nombre || this.faltaDuracionEnDiasCuidado) {
      return;
    }

    const datos = {
      nombre,
      frecuencia: this.frecuenciaCuidado,
      duracionTipo: this.duracionTipoCuidado,
      // El número de días solo se guarda con el tipo «días»
      duracionCantidad: this.duracionTipoCuidado === 'dias' ? this.duracionCantidadCuidado : null,
      observaciones: this.observacionesCuidado.trim(),
    };

    if (this.cuidadoEnEdicion !== null) {
      const idEditado = this.cuidadoEnEdicion;

      this.cuidados = this.cuidados.map((registrado) =>
        registrado.id === idEditado ? { ...registrado, ...datos } : registrado,
      );
    } else {
      const ultimoId = this.cuidados.reduce(
        (mayor, registrado) => Math.max(mayor, registrado.id),
        0,
      );

      this.cuidados = [
        ...this.cuidados,
        {
          id: ultimoId + 1,
          ...datos,
          estado: 'enProceso',
          fecha: '10/10/2026',
          hora: '09:30',
          medico: 'Dr. Gómez',
        },
      ];
    }

    this.limpiarFormularioCuidado();
  }

  /**
   * MOCK: la eliminación del cuidado se confirma con el popup global y el registro pasa al estado
   * eliminado, de modo que sale del listado vigente y queda disponible en el filtro «Eliminadas».
   */
  async eliminarCuidado(cuidado: CuidadoVista): Promise<void> {
    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el cuidado "${cuidado.nombre}"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    if (this.cuidadoEnEdicion === cuidado.id) {
      this.limpiarFormularioCuidado();
    }

    this.cuidados = this.cuidados.map<CuidadoVista>((registrado) =>
      registrado.id === cuidado.id ? { ...registrado, estado: 'eliminado' } : registrado,
    );
  }

  /** Opción del filtro de cuidados elegida en el listado. */
  private get filtroActualCuidado(): FiltroCuidadoVista {
    return (
      this.filtrosCuidado.find((filtro) => filtro.id === this.filtroCuidado) ??
      this.filtrosCuidado[0]
    );
  }
}
