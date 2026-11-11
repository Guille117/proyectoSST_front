import { DecimalPipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, TimeoutError, catchError, forkJoin, map, of } from 'rxjs';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../../Enfermeria/monitoreo/data/signosVitalesInterfaz';
import {
  fueraDeRango as evaluarFueraDeRango,
} from '../../../shared/signos-vitales/rangos-signos-vitales';
import { ControlHidricoService } from '../../Enfermeria/monitoreo/data/control-hidrico-service';
import { ControlHidricoResponse } from '../../Enfermeria/monitoreo/data/controlHidricoInterfaz';
import { GlucosaService } from '../../Enfermeria/monitoreo/data/glucosa-service';
import {
  GlucosaResponse,
  TipoMedicionGlucosaApi,
} from '../../Enfermeria/monitoreo/data/glucosaInterfaz';
import { NotaEnfermeriaService } from '../../Enfermeria/notas/data/nota-enfermeria-service';
import { NotaEnfermeriaResponse } from '../../Enfermeria/notas/data/notaEnfermeriaInterfaz';
import { RegistrosEnfermeriaService } from '../../Enfermeria/data/registrosEnfermeriaService';
import {
  AplicacionMedicamentoResponse,
  EjecucionCuidadoResponse,
} from '../../Enfermeria/data/registrosEnfermeriaInterfaz';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';
import { AltaService } from '../../Medica/alta/data/alta-service';
import { AltaResponse, TipoAltaApi } from '../../Medica/alta/data/altaInterfaz';
import { DiagnosticoService } from '../../Medica/evaluacion/data/diagnostico-service';
import {
  DiagnosticoResponse,
  TipoDiagnostico,
} from '../../Medica/evaluacion/data/diagnosticoInterfaz';
import { ExamenFisicoService } from '../../Medica/evaluacion/data/examen-fisico-service';
import { ExamenFisicoResponse } from '../../Medica/evaluacion/data/examenFisicoInterfaz';
import { HistoriaClinicaService } from '../../Medica/evaluacion/data/historia-clinica-service';
import { HistoriaClinicaResponse } from '../../Medica/evaluacion/data/historiaClinicaInterfaz';
import { EvolucionService } from '../../Medica/evolucion/data/evolucion-service';
import { EvolucionResponse } from '../../Medica/evolucion/data/evolucionInterfaz';
import { IndicacionCuidadoService } from '../../Medica/indicaciones/cuidados/data/cuidado-service';
import {
  CuidadoResponse,
  TipoDuracionCuidadoApi,
} from '../../Medica/indicaciones/cuidados/data/cuidadoInterfaz';
import { IndicacionExamenService } from '../../Medica/indicaciones/examenes/data/examen-service';
import { ExamenResponse } from '../../Medica/indicaciones/examenes/data/examenInterfaz';
import {
  MedicamentoIndicacionService,
} from '../../Medica/indicaciones/medicamentos/data/medicamento-service';
import {
  descripcionMedicamentoCompleta,
  MedicamentoIndicacionResponse,
  TipoDuracionApi,
} from '../../Medica/indicaciones/medicamentos/data/medicamentoInterfaz';
import {
  ProcedimientoMedicoService,
} from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import {
  ProcedimientoMedicoResponse,
  RecursoProcedimientoResponse,
} from '../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import { ConsumoEpisodioService } from '../paciente/data/consumo-service';
import { ConsumoEpisodio } from '../paciente/data/consumoInterfaz';
import { PacienteDetalle, TipoAtencion } from '../paciente/data/pacienteInterfaz';
import { PacienteService } from '../paciente/data/paciente-service';
import { EpisodioResumen, SeccionExpediente } from './data/expedienteInterfaz';
import { ExpedienteService } from './data/expediente-service';

interface OpcionExpedienteVista {
  id: SeccionExpediente;
  titulo: string;
  icono: string;
}

interface SeccionExpedienteVista {
  titulo: string | null;
  opciones: OpcionExpedienteVista[];
}

@Component({
  selector: 'app-expediente',
  imports: [DecimalPipe],
  templateUrl: './expediente.html',
  styleUrl: './expediente.scss',
})
export class Expediente implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioExpediente = inject(ExpedienteService);
  private readonly servicioSignos = inject(SignosVitalesService);
  private readonly servicioHistoria = inject(HistoriaClinicaService);
  private readonly servicioExamenFisico = inject(ExamenFisicoService);
  private readonly servicioDiagnostico = inject(DiagnosticoService);
  private readonly servicioExamen = inject(IndicacionExamenService);
  private readonly servicioProcedimiento = inject(ProcedimientoMedicoService);
  private readonly servicioEvolucion = inject(EvolucionService);
  private readonly servicioMedicamento = inject(MedicamentoIndicacionService);
  private readonly servicioCuidado = inject(IndicacionCuidadoService);
  private readonly servicioAlta = inject(AltaService);
  private readonly servicioGlucosa = inject(GlucosaService);
  private readonly servicioControl = inject(ControlHidricoService);
  private readonly servicioNotas = inject(NotaEnfermeriaService);
  private readonly servicioRegistros = inject(RegistrosEnfermeriaService);
  private readonly servicioConsumo = inject(ConsumoEpisodioService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Evalúa si un signo vital está fuera de su rango normal. */
  protected readonly fueraDeRango = evaluarFueraDeRango;

  private readonly destroyRef = inject(DestroyRef);

  paciente: PacienteDetalle | null = null;
  /** Episodios del paciente, del más reciente al más antiguo. */
  episodios: EpisodioResumen[] = [];
  episodioSeleccionado: EpisodioResumen | null = null;
  cargando = false;
  error = '';

  /** Signos vitales del episodio que muestra el panel de detalle. */
  signosVitales: SignosVitalesResponse[] = [];
  cargandoSignos = false;
  errorSignos = '';

  /** Datos de las secciones que muestra el panel derecho. */
  historiaClinica: HistoriaClinicaResponse[] = [];
  examenFisico: ExamenFisicoResponse[] = [];
  diagnosticos: DiagnosticoResponse[] = [];
  examenes: ExamenResponse[] = [];
  procedimientos: ProcedimientoMedicoResponse[] = [];
  evoluciones: EvolucionResponse[] = [];
  medicamentos: MedicamentoIndicacionResponse[] = [];
  cuidados: CuidadoResponse[] = [];
  alta: AltaResponse | null = null;
  glucosa: GlucosaResponse[] = [];
  controlHidrico: ControlHidricoResponse[] = [];
  notas: NotaEnfermeriaResponse[] = [];
  aplicaciones: AplicacionMedicamentoResponse[] = [];
  ejecuciones: EjecucionCuidadoResponse[] = [];
  consumo: ConsumoEpisodio | null = null;
  cargandoPanel = false;
  errorPanel = '';
  private solicitudSignos = 0;
  private solicitudPanel = 0;
  private erroresPanel: string[] = [];

  /** Opción del submenú actualmente seleccionada. */
  opcionActiva: SeccionExpediente = 'resumen';

  /** Título de la sección activa que encabeza el panel derecho. */
  get tituloSeccionActiva(): string {
    const titulos: Record<SeccionExpediente, string> = {
      resumen: 'Paciente',
      evaluacion: 'Evaluación clínica',
      examenes: 'Exámenes',
      procedimientos: 'Procedimientos',
      evolucion: 'Evolución médica',
      indicaciones: 'Indicaciones médicas',
      alta: 'Alta médica',
      'registros-enfermeria': 'Registros de enfermería',
      consumo: 'Consumo y estancia',
    };
    return titulos[this.opcionActiva];
  }

  /** Opciones del submenú izquierdo agrupadas por sección. */
  readonly seccionesMenu: SeccionExpedienteVista[] = [
    {
      titulo: null,
      opciones: [
        { id: 'resumen', titulo: 'Paciente', icono: 'bi-journal-text' },
        { id: 'evaluacion', titulo: 'Evaluación clínica', icono: 'bi-clipboard2-pulse' },
        { id: 'examenes', titulo: 'Exámenes', icono: 'bi-clipboard2-check' },
        { id: 'procedimientos', titulo: 'Procedimientos', icono: 'bi-scissors' },
        { id: 'evolucion', titulo: 'Evolución médica', icono: 'bi-graph-up-arrow' },
        { id: 'indicaciones', titulo: 'Indicaciones médicas', icono: 'bi-capsule' },
        { id: 'alta', titulo: 'Alta médica', icono: 'bi-box-arrow-up-right' },
      ],
    },
    {
      titulo: 'Enfermería',
      opciones: [
        {
          id: 'registros-enfermeria',
          titulo: 'Registros de enfermería',
          icono: 'bi-clipboard2-pulse',
        },
      ],
    },
    {
      titulo: null,
      opciones: [
        { id: 'consumo', titulo: 'Consumo y estancia', icono: 'bi-receipt' },
      ],
    },
  ];

  ngOnInit(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
      this.error = 'No se pudo identificar al paciente del expediente.';
      return;
    }
    this.cargar(pacienteId);
  }

  seleccionarOpcion(opcion: SeccionExpediente): void {
    this.opcionActiva = opcion;
    this.cdr.markForCheck();
  }

  /** Abre el expediente del episodio elegido y carga sus datos. */
  seleccionarEpisodio(episodio: EpisodioResumen): void {
    this.episodioSeleccionado = episodio;
    this.opcionActiva = 'resumen';
    this.cargarSignosVitales(episodio.episodioId);
    this.cargarPanel(episodio.episodioId);
    this.cdr.markForCheck();
  }

  /** Vuelve a la lista de episodios y descarta los datos del episodio abierto. */
  volverAListaEpisodios(): void {
    this.episodioSeleccionado = null;
    this.opcionActiva = 'resumen';
    this.cargarSignosVitales(null);
    this.cargarPanel(null);
    this.cdr.markForCheck();
  }

  volver(): void {
    this.location.back();
  }

  recargar(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (Number.isInteger(pacienteId) && pacienteId > 0) {
      this.cargar(pacienteId);
    }
  }

  /** Vuelve a consultar los signos vitales del episodio del panel. */
  recargarSignos(): void {
    this.cargarSignosVitales(this.episodioSeleccionado?.episodioId ?? null);
  }

  /** Vuelve a consultar los datos del panel derecho. */
  recargarPanel(): void {
    this.cargarPanel(this.episodioSeleccionado?.episodioId ?? null);
  }

  /** Abre el episodio elegido en el módulo Médico; si está cerrado, entra en solo lectura. */
  abrirEpisodioSeleccionado(): void {
    const episodio = this.episodioSeleccionado;
    if (!episodio) return;

    this.episodioActivo.guardar(episodio.episodioId, !episodio.activo);
    this.episodioActivo.guardarPaciente(this.paciente?.pacienteId ?? null);
    void this.router.navigate(['/medica', 'evaluacion']);
  }

  tipoAtencionLegible(tipo: TipoAtencion | null): string {
    if (!tipo) return '—';
    return tipo === 'HOSPITALIZACION' ? 'Hospitalización' : 'Emergencia';
  }

  /** Estado del episodio en la lista y en la cabecera del expediente. */
  estadoEpisodioLegible(episodio: EpisodioResumen): string {
    return episodio.activo ? 'En curso' : 'Cerrado';
  }

  /** Nombre del responsable del episodio elegido. */
  responsableEpisodio(episodio: EpisodioResumen | null): string {
    return episodio?.responsableNombre?.trim() || 'No registrado';
  }

  /** Teléfono del responsable del episodio elegido. */
  responsableTelefonoEpisodio(episodio: EpisodioResumen | null): string {
    return episodio?.responsableTelefono?.trim() || 'No registrado';
  }

  /** Motivo o descripción del episodio elegido. */
  motivoEpisodio(episodio: EpisodioResumen | null): string {
    return episodio?.descripcion?.trim() || '—';
  }

  /** Médico de la evaluación más reciente o el asignado al episodio elegido. */
  medicoResponsable(detalle: PacienteDetalle | null): string {
    return (
      this.ultimaEvaluacion?.usuarioNombre ||
      this.episodioSeleccionado?.medicoNombre ||
      detalle?.medicoNombre ||
      '—'
    );
  }

  tipoDiagnosticoLegible(tipo: TipoDiagnostico): string {
    if (tipo === 'PRINCIPAL') return 'Principal';
    if (tipo === 'PROVISIONAL') return 'Provisional';
    return 'Asociado';
  }

  tipoAltaLegible(tipo: TipoAltaApi): string {
    if (tipo === 'INDICACION_MEDICA') return 'Indicación médica';
    if (tipo === 'RETIRO_VOLUNTARIO') return 'Retiro voluntario';
    return 'Referencia / traslado';
  }

  tipoMedicionLegible(tipo: TipoMedicionGlucosaApi): string {
    if (tipo === 'AYUNAS') return 'Ayunas';
    if (tipo === 'PREPRANDIAL') return 'Preprandial';
    if (tipo === 'POSTPRANDIAL') return 'Postprandial';
    return 'Aleatoria';
  }

  /** Etiqueta legible de los estados que llegan del backend. */
  etiqueta(valor: string | null | undefined): string {
    if (!valor) return '—';
    const texto = valor.replaceAll('_', ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  textoDuracion(
    tipo: TipoDuracionApi | TipoDuracionCuidadoApi | null,
    dias: number | null,
  ): string {
    if (tipo === null) return '—';
    if (tipo === 'DOSIS_UNICA') return 'Dosis única';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'Tiempo indefinido';
    return `${dias ?? 0} ${dias === 1 ? 'día' : 'días'}`;
  }

  textoFrecuencia(frecuencia: number | null): string {
    if (frecuencia === null) return '—';
    return `Cada ${frecuencia} ${frecuencia === 1 ? 'hora' : 'horas'}`;
  }

  /** Descripción completa del medicamento: nombre, marca, presentación/dosis y vía. */
  textoMedicamento(medicamento: MedicamentoIndicacionResponse): string {
    const nombre = medicamento.medicamento?.trim();
    if (!nombre) {
      return medicamento.medicamentoLibre?.trim() || 'Medicamento no registrado';
    }

    return descripcionMedicamentoCompleta({
      nombre,
      marca: medicamento.medicamentoMarca,
      presentacion: medicamento.medicamentoPresentacion ?? medicamento.presentacion,
      dosis: medicamento.medicamentoDosis,
      unidadMedida: medicamento.medicamentoUnidad,
      viaAdministracion: medicamento.medicamentoViaAdministracion,
    });
  }

  textoRecursos(recursos: RecursoProcedimientoResponse[]): string {
    if (!recursos.length) return '—';
    return recursos.map((recurso) => `${recurso.nombre} (${recurso.cantidad})`).join(', ');
  }

  textoArchivos(examen: ExamenResponse): string {
    return examen.archivos.map((archivo) => archivo.nombreOriginal).join(', ') || '—';
  }

  /** Aplicaciones registradas de una indicación de medicamento. */
  aplicacionesDeIndicacion(indicacionId: number): AplicacionMedicamentoResponse[] {
    return this.aplicaciones.filter((item) => item.indicacionMedicamentoId === indicacionId);
  }

  /** Ejecuciones registradas de un cuidado indicado. */
  ejecucionesDeCuidado(cuidadoId: number): EjecucionCuidadoResponse[] {
    return this.ejecuciones.filter((item) => item.cuidadoId === cuidadoId);
  }

  /** Aplicaciones cuyo medicamento indicado ya no está en la lista del episodio. */
  get aplicacionesSinIndicacion(): AplicacionMedicamentoResponse[] {
    const indicaciones = new Set(this.medicamentos.map((item) => item.id));
    return this.aplicaciones.filter((item) => !indicaciones.has(item.indicacionMedicamentoId));
  }

  /** Ejecuciones cuyo cuidado indicado ya no está en la lista del episodio. */
  get ejecucionesSinCuidado(): EjecucionCuidadoResponse[] {
    const cuidados = new Set(this.cuidados.map((item) => item.id));
    return this.ejecuciones.filter((item) => !cuidados.has(item.cuidadoId));
  }

  sexoLegible(sexo: string | null | undefined): string {
    if (sexo === 'FEMENINO') return 'Femenino';
    if (sexo === 'MASCULINO') return 'Masculino';
    return '—';
  }

  /** Último registro de signos vitales del episodio, si existe. */
  get ultimoSignoVital(): SignosVitalesResponse | null {
    return this.signosVitales[0] ?? null;
  }

  /** Evaluación clínica más reciente del episodio, si existe. */
  get ultimaEvaluacion(): HistoriaClinicaResponse | null {
    return this.historiaClinica[0] ?? null;
  }

  /** Estado clínico registrado en la evaluación más reciente. */
  get estadoClinicoEvaluacion(): string | null {
    return this.ultimaEvaluacion?.estadoClinicoNombre ?? null;
  }

  /** Fecha y hora del detalle en el formato dd-mm-yyyy • HH:mm. */
  fechaHoraLegible(valor: string | null): string {
    if (!valor) return '—';

    const [fecha, hora = ''] = valor.split('T');
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return valor;

    return `${dia}-${mes}-${anio}${hora ? ` • ${hora.slice(0, 5)}` : ''}`;
  }

  /** Parte el texto en líneas cortas para que el tooltip nativo no se abra tan ancho. */
  textoTooltip(valor: string | null, porDefecto: string): string {
    const texto = (valor ?? '').trim() || porDefecto;
    const limite = 36;
    const palabras = texto.split(/\s+/);
    const lineas: string[] = [];
    let linea = '';

    for (const palabra of palabras) {
      if (!linea) {
        linea = palabra;
        continue;
      }

      if (`${linea} ${palabra}`.length > limite) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = `${linea} ${palabra}`;
      }
    }

    if (linea) lineas.push(linea);
    return lineas.join('\n');
  }

  fecha(valor: string | null): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return `${this.dosDigitos(fecha.getDate())}-${this.dosDigitos(
      fecha.getMonth() + 1,
    )}-${fecha.getFullYear()}`;
  }

  private dosDigitos(valor: number): string {
    return `${valor}`.padStart(2, '0');
  }

  private cargar(pacienteId: number): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      paciente: this.servicioPaciente.obtenerPaciente(pacienteId),
      episodios: this.servicioExpediente.listarEpisodios(pacienteId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, episodios }) => {
          this.paciente = paciente;
          this.episodios = this.ordenarEpisodios(episodios);
          this.episodioSeleccionado = null;
          this.opcionActiva = 'resumen';
          this.cargarSignosVitales(null);
          this.cargarPanel(null);
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.cargando = false;
          this.error = this.mensajeError(error, 'No se pudo cargar el expediente.');
          this.cdr.detectChanges();
        },
      });
  }

  /** Deja los episodios del más reciente al más antiguo. */
  private ordenarEpisodios(episodios: EpisodioResumen[]): EpisodioResumen[] {
    return [...episodios].sort(
      (a, b) => this.fechaMs(b.fechaHoraIngreso) - this.fechaMs(a.fechaHoraIngreso),
    );
  }

  /** Carga los signos vitales del episodio y deja el más reciente al inicio. */
  private cargarSignosVitales(episodioId: number | null): void {
    const solicitud = ++this.solicitudSignos;
    this.signosVitales = [];
    this.errorSignos = '';

    if (episodioId === null || episodioId <= 0) {
      this.cargandoSignos = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargandoSignos = true;
    this.cdr.markForCheck();

    this.servicioSignos
      .buscarPorEpisodio(episodioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registros) => {
          if (solicitud !== this.solicitudSignos) return;

          this.signosVitales = [...registros].sort(
            (a, b) => this.fechaMs(b.fecha) - this.fechaMs(a.fecha),
          );
          this.cargandoSignos = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (solicitud !== this.solicitudSignos) return;

          this.cargandoSignos = false;
          this.errorSignos = this.mensajeError(error, 'No se pudieron cargar los signos vitales.');
          this.cdr.detectChanges();
        },
      });
  }

  /** Carga en una sola pasada los datos de todas las secciones del panel derecho. */
  private cargarPanel(episodioId: number | null): void {
    const solicitud = ++this.solicitudPanel;
    this.historiaClinica = [];
    this.examenFisico = [];
    this.diagnosticos = [];
    this.examenes = [];
    this.procedimientos = [];
    this.evoluciones = [];
    this.medicamentos = [];
    this.cuidados = [];
    this.alta = null;
    this.glucosa = [];
    this.controlHidrico = [];
    this.notas = [];
    this.aplicaciones = [];
    this.ejecuciones = [];
    this.consumo = null;
    this.errorPanel = '';

    if (episodioId === null || episodioId <= 0) {
      this.cargandoPanel = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargandoPanel = true;
    this.cdr.markForCheck();

    const seccionesConError: string[] = [];
    this.erroresPanel = seccionesConError;

    forkJoin({
      historia: this.conRespaldo(
        this.servicioHistoria.getHistoriasPorEpisodio(episodioId, true),
        [] as HistoriaClinicaResponse[],
        'Historia clínica',
      ),
      examenFisico: this.conRespaldo(
        this.servicioExamenFisico.getExamenesPorEpisodio(episodioId, true),
        [] as ExamenFisicoResponse[],
        'Examen físico',
      ),
      diagnosticos: this.conRespaldo(
        this.servicioDiagnostico.getDiagnosticosPorEpisodio(episodioId, true),
        [] as DiagnosticoResponse[],
        'Impresión clínica',
      ),
      examenes: this.conRespaldo(
        this.servicioExamen.buscarPorEpisodio(episodioId, 'ACTIVO'),
        [] as ExamenResponse[],
        'Exámenes',
      ),
      procedimientos: this.conRespaldo(
        this.servicioProcedimiento
          .getProcedimientos(episodioId)
          .pipe(map((items) => items.filter((item) => item.estado !== 'ELIMINADO'))),
        [] as ProcedimientoMedicoResponse[],
        'Procedimientos',
      ),
      evoluciones: this.conRespaldo(
        this.servicioEvolucion.buscarPorEpisodio(episodioId, 'ACTIVA'),
        [] as EvolucionResponse[],
        'Evolución médica',
      ),
      medicamentos: this.conRespaldo(
        forkJoin([
          this.servicioMedicamento.getIndicacionesPorEpisodio(episodioId, 'ACTIVO'),
          this.servicioMedicamento.getIndicacionesPorEpisodio(episodioId, 'FINALIZADO'),
        ]).pipe(map(([activos, finalizados]) => [...activos, ...finalizados])),
        [] as MedicamentoIndicacionResponse[],
        'Medicamentos indicados',
      ),
      cuidados: this.conRespaldo(
        forkJoin([
          this.servicioCuidado.buscarPorEpisodio(episodioId, 'EN_PROCESO'),
          this.servicioCuidado.buscarPorEpisodio(episodioId, 'COMPLETADO'),
        ]).pipe(map(([enProceso, completados]) => [...enProceso, ...completados])),
        [] as CuidadoResponse[],
        'Cuidados indicados',
      ),
      altas: this.conRespaldo(
        this.servicioAlta
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => item.estado === 'VIGENTE'))),
        [] as AltaResponse[],
        'Alta médica',
      ),
      glucosa: this.conRespaldo(
        this.servicioGlucosa
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as GlucosaResponse[],
        'Glucosa',
      ),
      control: this.conRespaldo(
        this.servicioControl
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as ControlHidricoResponse[],
        'Control hídrico',
      ),
      notas: this.conRespaldo(
        this.servicioNotas
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as NotaEnfermeriaResponse[],
        'Notas de enfermería',
      ),
      aplicaciones: this.conRespaldo(
        this.servicioRegistros.buscarAplicacionesPorEpisodio(episodioId),
        [] as AplicacionMedicamentoResponse[],
        'Aplicaciones de medicamentos',
      ),
      ejecuciones: this.conRespaldo(
        this.servicioRegistros.buscarEjecucionesPorEpisodio(episodioId),
        [] as EjecucionCuidadoResponse[],
        'Ejecuciones de cuidados',
      ),
      consumo: this.conRespaldo(
        this.servicioConsumo.obtenerConsumo(episodioId),
        null as ConsumoEpisodio | null,
        'Consumo y estancia',
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          if (solicitud !== this.solicitudPanel) return;

          this.historiaClinica = this.ordenarPorFechaDesc(datos.historia, (item) => item.fecha);
          this.examenFisico = this.ordenarPorFechaDesc(datos.examenFisico, (item) => item.fecha);
          this.diagnosticos = this.ordenarPorFechaDesc(datos.diagnosticos, (item) => item.fecha);
          this.examenes = this.ordenarPorFechaDesc(datos.examenes, (item) => item.fecha);
          this.procedimientos = this.ordenarPorFechaDesc(
            datos.procedimientos,
            (item) => item.inicio,
          );
          this.evoluciones = this.ordenarPorFechaDesc(datos.evoluciones, (item) => item.fecha);
          this.medicamentos = this.ordenarPorFechaDesc(
            datos.medicamentos,
            (item) => item.fechaInicio,
          );
          this.cuidados = this.ordenarPorFechaDesc(datos.cuidados, (item) => item.fechaInicio);
          this.alta = datos.altas[0] ?? null;
          this.glucosa = this.ordenarPorFechaDesc(datos.glucosa, (item) => item.fecha);
          this.controlHidrico = this.ordenarPorFechaDesc(datos.control, (item) => item.fecha);
          this.notas = this.ordenarPorFechaDesc(datos.notas, (item) => item.fecha);
          this.aplicaciones = this.ordenarPorFechaDesc(
            datos.aplicaciones,
            (item) => item.fechaHoraProgramada,
          );
          this.ejecuciones = this.ordenarPorFechaDesc(
            datos.ejecuciones,
            (item) => item.fechaHoraProgramada,
          );
          this.consumo = datos.consumo;
          this.cargandoPanel = false;

          if (seccionesConError.length) {
            this.errorPanel = `No se pudieron cargar: ${seccionesConError.join(', ')}.`;
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (solicitud !== this.solicitudPanel) return;

          this.cargandoPanel = false;
          this.errorPanel = this.mensajeError(error, 'No se pudieron cargar los datos del panel.');
          this.cdr.detectChanges();
        },
      });
  }

  private conRespaldo<T>(observable: Observable<T>, respaldo: T, seccion: string): Observable<T> {
    const errores = this.erroresPanel;
    return observable.pipe(
      catchError(() => {
        errores.push(seccion);
        return of(respaldo);
      }),
    );
  }

  /** Ordena los registros por fecha, del más reciente al más antiguo. */
  private ordenarPorFechaDesc<T>(
    items: T[],
    obtenerFecha: (item: T) => string | null | undefined,
  ): T[] {
    return [...items].sort(
      (a, b) => this.fechaMs(obtenerFecha(b)) - this.fechaMs(obtenerFecha(a)),
    );
  }

  /** Fecha de un registro clínico en milisegundos; los valores inválidos quedan al final. */
  private fechaMs(valor: string | null | undefined): number {
    if (!valor) return 0;
    const fecha = new Date(valor).getTime();
    return Number.isNaN(fecha) ? 0 : fecha;
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    if (error instanceof TimeoutError) {
      return 'Error de comunicación. El servidor no respondió dentro del tiempo esperado.';
    }

    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error;
      if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
        const mensaje = String((cuerpo as { message?: unknown }).message ?? '').trim();
        if (mensaje) return mensaje;
      }
      if (typeof cuerpo === 'string' && cuerpo.trim()) return cuerpo.trim();
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const mensaje = String((error as { message?: unknown }).message ?? '').trim();
      if (mensaje) return mensaje;
    }

    return porDefecto;
  }
}
