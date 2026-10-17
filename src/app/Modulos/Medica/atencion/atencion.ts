import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteResumido, TipoAtencion } from '../../Pacientes/paciente/data/pacienteInterfaz';

/** Filtro del listado de pacientes por tipo de atención. */
type FiltroAtencion = 'todos' | 'emergencia' | 'hospitalizacion';

/** Orden del listado de pacientes. */
type OrdenAtencion = 'reciente' | 'nombre';

/** Estado de atención con el que se etiqueta la tarjeta del paciente. */
type EstadoAtencion = 'en-atencion' | 'pendiente' | 'en-observacion';

/** Signo vital que se muestra en el panel del paciente seleccionado. */
interface SignoVitalVista {
  etiqueta: string;
  valor: string;
  unidad: string;
}

/** Paciente del listado: datos reales del resumen y detalle temporal mientras no hay contrato. */
interface PacienteAtencionVista {
  expediente: string;
  nombre: string;
  edad: number;
  sexo: string;
  estadoAtencion: EstadoAtencion;
  tipoAtencion: TipoAtencion;
  /** Código de la cama o del box según el tipo de atención, sin la etiqueta. */
  ubicacion: string;
  diagnostico: string;
  fechaIngreso: string;
  alergias: string;
  signosVitales: SignoVitalVista[];
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Pacientes en atención que devuelve el backend con el detalle temporal de la maqueta. */
  pacientes: PacienteAtencionVista[] = [];

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

  /** Etiquetas del tipo de atención del paciente. */
  protected readonly etiquetasTipo: Record<TipoAtencion, string> = {
    HOSPITALIZACION: 'Hospitalización',
    EMERGENCIA: 'Emergencia',
  };

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Pacientes que cumplen el filtro y la búsqueda, con el orden elegido. */
  get pacientesFiltrados(): PacienteAtencionVista[] {
    const texto = this.textoBusqueda.trim().toLowerCase();

    const filtrados = this.pacientes.filter((paciente) => {
      if (!this.coincideFiltro(paciente)) return false;
      if (!texto) return true;

      return (
        paciente.nombre.toLowerCase().includes(texto) ||
        paciente.expediente.toLowerCase().includes(texto)
      );
    });

    return filtrados.sort((a, b) =>
      this.orden === 'nombre'
        ? a.nombre.localeCompare(b.nombre)
        : this.fechaIngresoMs(b) - this.fechaIngresoMs(a),
    );
  }

  /** Solo las atenciones con hospitalización tienen cama; la emergencia no muestra destino. */
  protected esHospitalizacion(paciente: PacienteAtencionVista): boolean {
    return paciente.tipoAtencion === 'HOSPITALIZACION';
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

  /** Elige el paciente cuyo detalle muestra el panel de la derecha. */
  seleccionarPaciente(paciente: PacienteAtencionVista): void {
    this.pacienteSeleccionado = paciente;
  }

  /** Cambia el filtro del listado y ajusta la selección a lo que queda a la vista. */
  cambiarFiltro(filtro: FiltroAtencion): void {
    this.filtroActivo = filtro;
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
    }
  }

  /** Abre el episodio del paciente: entra a evaluación clínica y quedan a la vista los submódulos. */
  abrirEpisodio(): void {
    if (!this.pacienteSeleccionado) return;

    this.router.navigate(['/medica', 'evaluacion']);
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

  /** Combina los datos reales del resumen con el detalle temporal de la maqueta. */
  private aVista(paciente: PacienteResumido, posicion: number): PacienteAtencionVista {
    const detalle = DETALLES_MOCK[posicion % DETALLES_MOCK.length];

    return {
      expediente: paciente.codigoExpediente,
      nombre: paciente.nombreCompleto,
      tipoAtencion: paciente.tipoTratamiento,
      ...detalle,
    };
  }

  /** Fecha de ingreso del orden «más reciente»: el dato se escribe como dd-mm-yyyy. */
  private fechaIngresoMs(paciente: PacienteAtencionVista): number {
    const [dia, mes, anio] = paciente.fechaIngreso.split('-');
    return new Date(Number(anio), Number(mes) - 1, Number(dia)).getTime();
  }
}
