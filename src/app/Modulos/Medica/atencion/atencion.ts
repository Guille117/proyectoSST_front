import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteResumido, TipoAtencion } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AltaService } from '../alta/data/alta-service';
import { AltaRecienteResponse, TipoAltaApi } from '../alta/data/altaInterfaz';
import { EpisodioActivoService } from '../data/episodio-activo-service';

/** Filtro del listado de pacientes por tipo de atención o por altas recientes. */
type FiltroAtencion = 'todos' | 'emergencia' | 'hospitalizacion' | 'altasRecientes';

/** Orden del listado de pacientes. */
type OrdenAtencion = 'reciente' | 'nombre';

/** Estado de atención con el que se etiqueta la tarjeta del paciente. */
type EstadoAtencion = 'en-atencion' | 'pendiente' | 'en-observacion' | 'alta';

/** Egreso del paciente que se muestra cuando el listado filtra altas recientes. */
interface EgresoVista {
  tipoAlta: TipoAltaApi;
  fecha: string;
  hora: string;
  condicion: string;
  observacion: string;
}

/** Signo vital que se muestra en el panel del paciente seleccionado. */
interface SignoVitalVista {
  etiqueta: string;
  valor: string;
  unidad: string;
}

/** Paciente del listado: datos reales del resumen y detalle temporal mientras no hay contrato. */
interface PacienteAtencionVista {
  expediente: string;
  episodioId: number | null;
  ultimoEpisodioId: number | null;
  nombre: string;
  edad: number | null;
  sexo: string;
  estadoAtencion: EstadoAtencion;
  tipoAtencion: TipoAtencion;
  /** Código de la cama o del box según el tipo de atención, sin la etiqueta. */
  ubicacion: string;
  diagnostico: string;
  fechaIngreso: string;
  alergias: string;
  signosVitales: SignoVitalVista[];
  /** El paciente viene del listado de altas recientes y su episodio ya está cerrado. */
  esAlta: boolean;
  /** Datos del egreso cuando el paciente viene del listado de altas recientes. */
  egreso: EgresoVista | null;
}

/** Detalle de la maqueta que acompaña a cada paciente del listado. */
type DetallePacienteMock = Pick<
  PacienteAtencionVista,
  'edad' | 'sexo' | 'estadoAtencion' | 'ubicacion' | 'diagnostico' | 'fechaIngreso' | 'alergias'
> & { signosVitales: SignoVitalVista[] };

// MOCK: detalle temporal de diseño. Se sustituirá por el detalle real del episodio del paciente
// (edad, sexo, estado, cama, diagnóstico, alergias y signos vitales) en la fase de integración.
/** Signos vitales de la maqueta que comparten los pacientes sin datos propios. */
const SIGNOS_VITALES_MOCK: SignoVitalVista[] = [
  { etiqueta: 'PA', valor: '120/80', unidad: 'mmHg' },
  { etiqueta: 'FC', valor: '82', unidad: 'lpm' },
  { etiqueta: 'Temp', valor: '37.2', unidad: '°C' },
  { etiqueta: 'SpO2', valor: '97', unidad: '%' },
];

/** Detalle de la maqueta: se reparte por posición entre los pacientes que devuelve el backend. */
const DETALLES_MOCK: DetallePacienteMock[] = [
  {
    edad: 45,
    sexo: 'Masculino',
    estadoAtencion: 'en-atencion',
    ubicacion: 'A-105',
    diagnostico: 'Gastroenteritis aguda',
    fechaIngreso: '10-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 32,
    sexo: 'Femenino',
    estadoAtencion: 'en-atencion',
    ubicacion: '2',
    diagnostico: 'Cólico renal',
    fechaIngreso: '10-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 58,
    sexo: 'Masculino',
    estadoAtencion: 'pendiente',
    ubicacion: 'A-106',
    diagnostico: 'Neumonía adquirida en la comunidad',
    fechaIngreso: '10-10-2026',
    alergias: 'Penicilina',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 27,
    sexo: 'Femenino',
    estadoAtencion: 'en-observacion',
    ubicacion: 'B-201',
    diagnostico: 'Postoperatorio de apendicectomía',
    fechaIngreso: '09-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
];
// ------------------- FIN MOCK -------------------

/**
 * Atención médica: pantalla con la que arranca el módulo Médico. Lista los pacientes en atención (con
 * buscador, filtro por tipo de atención y orden) y muestra a la derecha la información del paciente
 * seleccionado, que por defecto es el primero de la lista. El botón Abrir episodio deja a la vista
 * los submódulos del episodio (evaluación clínica, indicaciones, evolución y alta).
 */
@Component({
  selector: 'app-atencion',
  imports: [FormsModule],
  templateUrl: './atencion.html',
  styleUrl: './atencion.scss',
})
export class Atencion implements OnInit, OnDestroy {
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioAltas = inject(AltaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly popUps = inject(PopUps);
  private readonly episodioActivo = inject(EpisodioActivoService);

  /** Configuración del módulo que reutiliza la pantalla (Médica o Enfermería). */
  protected readonly mostrarAltas = this.route.snapshot.data['mostrarAltas'] !== false;
  protected readonly mostrarExpediente = this.route.snapshot.data['mostrarExpediente'] !== false;
  protected readonly mostrarUltimoEpisodio =
    this.route.snapshot.data['mostrarUltimoEpisodio'] !== false;
  private readonly rutaEpisodio =
    (this.route.snapshot.data['rutaEpisodio'] as string[] | undefined) ?? ['/medica', 'evaluacion'];
  private readonly rutaUltimoEpisodio =
    (this.route.snapshot.data['rutaUltimoEpisodio'] as string[] | undefined) ?? [
      '/medica',
      'evaluacion',
    ];

  private destruido = false;
  private peticionAltas?: Subscription;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Pacientes en atención que devuelve el backend con el detalle temporal de la maqueta. */
  pacientes: PacienteAtencionVista[] = [];

  /** Pacientes dados de alta en las últimas 48 horas. */
  altasRecientes: PacienteAtencionVista[] = [];

  /** Paciente cuyo detalle se muestra en el panel de la derecha; nulo mientras no hay lista. */
  pacienteSeleccionado: PacienteAtencionVista | null = null;

  /** Filtro de tipo de atención activo en el listado. */
  filtroActivo: FiltroAtencion = 'todos';

  /** Texto del buscador: filtra por nombre o expediente. */
  textoBusqueda = '';

  /** Orden del listado de pacientes. */
  orden: OrdenAtencion = 'reciente';

  /** Mientras carga el listado y cuando falla la carga. */
  cargando = false;
  errorCarga = false;

  /** Mientras cargan las altas recientes y cuando falla la consulta. */
  cargandoAltas = false;
  errorAltas = false;

  /** Etiquetas del tipo de atención del paciente. */
  protected readonly etiquetasTipo: Record<TipoAtencion, string> = {
    HOSPITALIZACION: 'Hospitalización',
    EMERGENCIA: 'Emergencia',
  };

  /** Etiquetas del tipo de alta del paciente. */
  protected readonly etiquetasTipoAlta: Record<TipoAltaApi, string> = {
    INDICACION_MEDICA: 'Alta médica',
    RETIRO_VOLUNTARIO: 'Retiro voluntario',
    REFERENCIA_TRASLADO: 'Referencia o traslado',
  };

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Pacientes que cumplen el filtro y la búsqueda, con el orden elegido. */
  get pacientesFiltrados(): PacienteAtencionVista[] {
    const texto = this.textoBusqueda.trim().toLowerCase();
    const base = this.filtroActivo === 'altasRecientes' ? this.altasRecientes : this.pacientes;
    const buscando = texto.length > 0;

    const filtrados = base.filter((paciente) => {
      // La búsqueda incluye a los egresados; sin texto, los filtros solo listan pacientes activos
      if (buscando) {
        return (
          paciente.nombre.toLowerCase().includes(texto) ||
          paciente.expediente.toLowerCase().includes(texto)
        );
      }

      if (this.filtroActivo === 'altasRecientes') return true;
      if (paciente.episodioId === null) return false;

      return this.coincideFiltro(paciente);
    });

    return filtrados.sort((a, b) =>
      this.orden === 'nombre'
        ? a.nombre.localeCompare(b.nombre)
        : this.fechaIngresoMs(b) - this.fechaIngresoMs(a),
    );
  }

  /** Texto del listado cuando no hay pacientes que mostrar. */
  get mensajeListaVacio(): string {
    return this.filtroActivo === 'altasRecientes'
      ? 'No hay pacientes dados de alta en las últimas 48 horas.'
      : 'No hay pacientes que coincidan con la búsqueda.';
  }

  /** Solo las atenciones con hospitalización tienen cama; la emergencia y las altas no muestran destino. */
  protected esHospitalizacion(paciente: PacienteAtencionVista): boolean {
    return paciente.tipoAtencion === 'HOSPITALIZACION' && !paciente.esAlta;
  }

  /** El paciente está seleccionado y su detalle se muestra a la derecha. */
  protected esSeleccionado(paciente: PacienteAtencionVista): boolean {
    return this.pacienteSeleccionado?.expediente === paciente.expediente;
  }

  /** Clases de la tarjeta del paciente: el acento de la atención y el realce de la selección. */
  protected claseCard(paciente: PacienteAtencionVista): string {
    const clases = ['paciente-card'];

    if (paciente.tipoAtencion === 'EMERGENCIA') clases.push('paciente-card--emergencia');
    if (paciente.estadoAtencion === 'pendiente') clases.push('paciente-card--pendiente');
    if (this.esSeleccionado(paciente)) clases.push('paciente-card--activa');

    return clases.join(' ');
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  ngOnInit(): void {
    this.listarPacientes();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionAltas?.unsubscribe();
  }

  /** Carga los pacientes en atención y deja seleccionado el primero del listado. */
  listarPacientes(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();

    this.servicioPaciente.listarPacientes().subscribe({
      next: (pacientes) => {
        if (this.destruido) return;

        this.pacientes = pacientes.map((paciente, posicion) => this.aVista(paciente, posicion));
        this.pacienteSeleccionado = this.pacientesFiltrados[0] ?? null;
        this.episodioActivo.guardar(this.pacienteSeleccionado?.episodioId ?? null);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (this.destruido) return;

        console.error('Error al listar los pacientes en atención', error);
        this.pacientes = [];
        this.pacienteSeleccionado = null;
        this.cargando = false;
        this.errorCarga = true;
        this.cdr.detectChanges();
      },
    });
  }

  /** Carga los pacientes dados de alta en las últimas 48 horas. */
  cargarAltasRecientes(): void {
    if (!this.mostrarAltas || this.destruido || this.cargandoAltas) return;

    this.cargandoAltas = true;
    this.errorAltas = false;
    this.pacienteSeleccionado = null;
    this.cdr.markForCheck();
    this.peticionAltas?.unsubscribe();

    this.peticionAltas = this.servicioAltas
      .recientes(48)
      .pipe(
        finalize(() => {
          this.cargandoAltas = false;
          if (!this.destruido) this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (altas) => {
          if (this.destruido) return;

          this.altasRecientes = altas.map((alta) => this.aVistaAlta(alta));
          if (this.filtroActivo === 'altasRecientes') {
            this.pacienteSeleccionado = this.pacientesFiltrados[0] ?? null;
          }
        },
        error: (error) => {
          if (this.destruido) return;

          console.error('Error al listar las altas recientes', error);
          this.altasRecientes = [];
          this.pacienteSeleccionado = null;
          this.errorAltas = true;
        },
      });
  }

  /** Elige el paciente cuyo detalle muestra el panel de la derecha y guarda su episodio activo. */
  seleccionarPaciente(paciente: PacienteAtencionVista): void {
    this.pacienteSeleccionado = paciente;
    if (!paciente.esAlta) {
      this.episodioActivo.guardar(paciente.episodioId);
    }
  }

  /** Cambia el filtro del listado y ajusta la selección a lo que queda a la vista. */
  cambiarFiltro(filtro: FiltroAtencion): void {
    if (filtro === 'altasRecientes' && !this.mostrarAltas) return;

    this.filtroActivo = filtro;

    if (filtro === 'altasRecientes') {
      this.cargarAltasRecientes();
      return;
    }

    this.asegurarSeleccion();
  }

  /**
   * Mantiene seleccionado un paciente visible: si el filtro o la búsqueda dejan fuera al que estaba
   * elegido, se selecciona el primero que quede en el listado.
   */
  asegurarSeleccion(): void {
    const visibles = this.pacientesFiltrados;
    if (
      !this.pacienteSeleccionado ||
      !visibles.some((paciente) => paciente.expediente === this.pacienteSeleccionado?.expediente)
    ) {
      this.pacienteSeleccionado = visibles[0] ?? null;
      if (this.pacienteSeleccionado && !this.pacienteSeleccionado.esAlta) {
        this.episodioActivo.guardar(this.pacienteSeleccionado.episodioId);
      }
    }
  }

  /** Abre el episodio del paciente: entra a evaluación clínica y quedan a la vista los submódulos. */
  abrirEpisodio(): void {
    if (!this.pacienteSeleccionado) return;

    if (this.pacienteSeleccionado.esAlta) {
      this.popUps.advertencia(
        'El paciente ya tiene el alta registrada; no se puede abrir el episodio.',
      );
      return;
    }

    if (this.pacienteSeleccionado.episodioId === null) {
      this.popUps.advertencia('El paciente seleccionado no tiene un episodio activo.');
      return;
    }

    this.episodioActivo.guardar(this.pacienteSeleccionado.episodioId);
    this.router.navigate(this.rutaEpisodio);
  }

  /**
   * Abre el último episodio de un paciente egresado en modo solo lectura: sus pantallas muestran el
   * historial completo, pero ocultan las acciones de crear, editar y eliminar.
   */
  abrirUltimoEpisodio(): void {
    if (!this.pacienteSeleccionado) return;

    const episodioId = this.pacienteSeleccionado.ultimoEpisodioId ?? null;
    if (episodioId === null) {
      this.popUps.advertencia('El paciente seleccionado no tiene episodios registrados.');
      return;
    }

    this.episodioActivo.guardar(episodioId, true);
    this.router.navigate(this.rutaUltimoEpisodio);
  }

  // TODO fase 2: abrir el expediente clínico del paciente seleccionado cuando exista esa pantalla.
  /** Abre el expediente del paciente; todavía sin destino en el módulo. */
  abrirExpediente(): void {}

  // ------------------- AUXILIARES -------------------
  /** El paciente pasa el filtro de tipo de atención activo. */
  private coincideFiltro(paciente: PacienteAtencionVista): boolean {
    if (this.filtroActivo === 'emergencia') return paciente.tipoAtencion === 'EMERGENCIA';
    if (this.filtroActivo === 'hospitalizacion') return paciente.tipoAtencion === 'HOSPITALIZACION';
    return true;
  }

  /** Traduce un alta reciente del backend a la tarjeta y al detalle de la pantalla. */
  private aVistaAlta(alta: AltaRecienteResponse): PacienteAtencionVista {
    const fecha = new Date(alta.fechaHoraEgreso);

    return {
      expediente: alta.codigoExpediente ?? '',
      episodioId: null,
      ultimoEpisodioId: alta.episodioId,
      nombre: alta.nombreCompleto,
      edad: alta.edad,
      sexo: this.textoSexo(alta.sexo),
      estadoAtencion: 'alta',
      tipoAtencion: alta.tipoAtencion,
      ubicacion: '',
      diagnostico: alta.diagnosticoEgreso,
      fechaIngreso: this.formatearFecha(fecha),
      alergias: '',
      signosVitales: [],
      esAlta: true,
      egreso: {
        tipoAlta: alta.tipoAlta,
        fecha: this.formatearFecha(fecha),
        hora: this.formatearHora(fecha),
        condicion: alta.condicionEgresoNombre?.trim() || 'No registrada',
        observacion: alta.observacionEgreso?.trim() || 'Sin observaciones',
      },
    };
  }

  /** Texto del sexo del paciente para la ficha. */
  private textoSexo(sexo: AltaRecienteResponse['sexo']): string {
    if (sexo === 'MASCULINO') return 'Masculino';
    if (sexo === 'FEMENINO') return 'Femenino';
    return '—';
  }

  /** Fecha de la ficha en el formato dd-mm-yyyy. */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}-${mes}-${fecha.getFullYear()}`;
  }

  /** Hora de la ficha en el formato HH:mm. */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Combina los datos reales del resumen con el detalle temporal de la maqueta. */
  private aVista(paciente: PacienteResumido, posicion: number): PacienteAtencionVista {
    const detalle = DETALLES_MOCK[posicion % DETALLES_MOCK.length];

    return {
      expediente: paciente.codigoExpediente,
      episodioId: paciente.episodioId,
      ultimoEpisodioId: paciente.ultimoEpisodioId ?? paciente.episodioId ?? null,
      nombre: paciente.nombreCompleto,
      tipoAtencion: paciente.tipoTratamiento,
      esAlta: false,
      egreso: null,
      ...detalle,
    };
  }

  /** Fecha de ingreso del orden «más reciente»: el dato se escribe como dd-mm-yyyy. */
  private fechaIngresoMs(paciente: PacienteAtencionVista): number {
    const [dia, mes, anio] = paciente.fechaIngreso.split('-');
    return new Date(Number(anio), Number(mes) - 1, Number(dia)).getTime();
  }
}
