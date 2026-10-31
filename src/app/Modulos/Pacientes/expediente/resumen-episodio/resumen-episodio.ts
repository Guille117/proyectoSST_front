import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AltaService } from '../../../Medica/alta/data/alta-service';
import { AltaResponse, TipoAltaApi } from '../../../Medica/alta/data/altaInterfaz';
import { DiagnosticoService } from '../../../Medica/evaluacion/data/diagnostico-service';
import {
  DiagnosticoResponse,
  TipoDiagnostico,
} from '../../../Medica/evaluacion/data/diagnosticoInterfaz';
import { ExamenFisicoService } from '../../../Medica/evaluacion/data/examen-fisico-service';
import { ExamenFisicoResponse } from '../../../Medica/evaluacion/data/examenFisicoInterfaz';
import { HistoriaClinicaService } from '../../../Medica/evaluacion/data/historia-clinica-service';
import { HistoriaClinicaResponse } from '../../../Medica/evaluacion/data/historiaClinicaInterfaz';
import { EvolucionService } from '../../../Medica/evolucion/data/evolucion-service';
import { EvolucionResponse } from '../../../Medica/evolucion/data/evolucionInterfaz';
import { IndicacionCuidadoService } from '../../../Medica/indicaciones/cuidados/data/cuidado-service';
import {
  CuidadoResponse,
  TipoDuracionCuidadoApi,
} from '../../../Medica/indicaciones/cuidados/data/cuidadoInterfaz';
import { IndicacionExamenService } from '../../../Medica/indicaciones/examenes/data/examen-service';
import { ExamenResponse } from '../../../Medica/indicaciones/examenes/data/examenInterfaz';
import { MedicamentoIndicacionService } from '../../../Medica/indicaciones/medicamentos/data/medicamento-service';
import {
  MedicamentoIndicacionResponse,
  TipoDuracionApi,
} from '../../../Medica/indicaciones/medicamentos/data/medicamentoInterfaz';
import { ProcedimientoMedicoService } from '../../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import {
  ProcedimientoMedicoResponse,
  RecursoProcedimientoResponse,
} from '../../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import { RegistrosEnfermeriaService } from '../../../Enfermeria/data/registrosEnfermeriaService';
import {
  AplicacionMedicamentoResponse,
  EjecucionCuidadoResponse,
} from '../../../Enfermeria/data/registrosEnfermeriaInterfaz';
import { ControlHidricoService } from '../../../Enfermeria/monitoreo/data/control-hidrico-service';
import { ControlHidricoResponse } from '../../../Enfermeria/monitoreo/data/controlHidricoInterfaz';
import { GlucosaService } from '../../../Enfermeria/monitoreo/data/glucosa-service';
import {
  GlucosaResponse,
  TipoMedicionGlucosaApi,
} from '../../../Enfermeria/monitoreo/data/glucosaInterfaz';
import { SignosVitalesService } from '../../../Enfermeria/monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../../../Enfermeria/monitoreo/data/signosVitalesInterfaz';
import { NotaEnfermeriaService } from '../../../Enfermeria/notas/data/nota-enfermeria-service';
import { NotaEnfermeriaResponse } from '../../../Enfermeria/notas/data/notaEnfermeriaInterfaz';
import { ConsumoEpisodioService } from '../../paciente/data/consumo-service';
import { ConsumoEpisodio } from '../../paciente/data/consumoInterfaz';
import { PacienteDetalle, TipoAtencion } from '../../paciente/data/pacienteInterfaz';
import { EpisodioResumen, SeccionExpediente } from '../data/expedienteInterfaz';

@Component({
  selector: 'app-resumen-episodio',
  imports: [DecimalPipe],
  templateUrl: './resumen-episodio.html',
  styleUrl: './resumen-episodio.scss',
})
export class ResumenEpisodio implements OnChanges {
  @Input({ required: true }) episodioId!: number;
  @Input() paciente: PacienteDetalle | null = null;
  @Input() episodio: EpisodioResumen | null = null;
  @Input() seccion: SeccionExpediente = 'resumen';

  private readonly servicioHistoria = inject(HistoriaClinicaService);
  private readonly servicioExamenFisico = inject(ExamenFisicoService);
  private readonly servicioDiagnostico = inject(DiagnosticoService);
  private readonly servicioEvolucion = inject(EvolucionService);
  private readonly servicioMedicamento = inject(MedicamentoIndicacionService);
  private readonly servicioCuidado = inject(IndicacionCuidadoService);
  private readonly servicioExamen = inject(IndicacionExamenService);
  private readonly servicioProcedimiento = inject(ProcedimientoMedicoService);
  private readonly servicioAlta = inject(AltaService);
  private readonly servicioSignos = inject(SignosVitalesService);
  private readonly servicioControl = inject(ControlHidricoService);
  private readonly servicioGlucosa = inject(GlucosaService);
  private readonly servicioNotas = inject(NotaEnfermeriaService);
  private readonly servicioRegistros = inject(RegistrosEnfermeriaService);
  private readonly servicioConsumo = inject(ConsumoEpisodioService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  historiaClinica: HistoriaClinicaResponse[] = [];
  examenFisico: ExamenFisicoResponse[] = [];
  diagnosticos: DiagnosticoResponse[] = [];
  evoluciones: EvolucionResponse[] = [];
  medicamentos: MedicamentoIndicacionResponse[] = [];
  cuidados: CuidadoResponse[] = [];
  examenes: ExamenResponse[] = [];
  procedimientos: ProcedimientoMedicoResponse[] = [];
  alta: AltaResponse | null = null;
  signosVitales: SignosVitalesResponse[] = [];
  controlHidrico: ControlHidricoResponse[] = [];
  glucosa: GlucosaResponse[] = [];
  notas: NotaEnfermeriaResponse[] = [];
  aplicaciones: AplicacionMedicamentoResponse[] = [];
  ejecuciones: EjecucionCuidadoResponse[] = [];
  consumo: ConsumoEpisodio | null = null;

  cargando = false;
  error = '';
  seccionesConError: string[] = [];
  private solicitud = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['episodioId'] && this.episodioId) {
      this.cargar();
    }
  }

  recargar(): void {
    this.cargar();
  }

  /** Título de la sección activa del expediente. */
  get tituloSeccion(): string {
    return {
      resumen: 'Resumen del episodio',
      evaluacion: 'Evaluación clínica',
      examenes: 'Exámenes',
      procedimientos: 'Procedimientos',
      evolucion: 'Evolución médica',
      indicaciones: 'Indicaciones médicas',
      alta: 'Alta médica',
      'registros-enfermeria': 'Registros de enfermería',
      consumo: 'Consumo y estancia',
    }[this.seccion];
  }

  /** Descripción breve de la sección activa del expediente. */
  get descripcionSeccion(): string {
    return {
      resumen: 'Información general del episodio.',
      evaluacion: 'Historia clínica, examen físico y diagnósticos.',
      examenes: 'Exámenes indicados y sus archivos.',
      procedimientos: 'Procedimientos médicos realizados en el episodio.',
      evolucion: 'Evoluciones clínicas y planes médicos.',
      indicaciones: 'Medicamentos y cuidados indicados.',
      alta: 'Datos del egreso y tratamiento indicado.',
      'registros-enfermeria': 'Monitoreo, notas y tratamientos realizados por Enfermería.',
      consumo: 'Productos entregados y días de cama utilizados.',
    }[this.seccion];
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

  private fechaMs(valor: string | null | undefined): number {
    if (!valor) return 0;
    const fecha = new Date(valor).getTime();
    return Number.isNaN(fecha) ? 0 : fecha;
  }

  private cargar(): void {
    const episodioId = this.episodioId;
    if (!episodioId) return;

    const solicitud = ++this.solicitud;
    this.cargando = true;
    this.error = '';
    this.seccionesConError = [];

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
        'Diagnósticos',
      ),
      evoluciones: this.conRespaldo(
        this.servicioEvolucion.buscarPorEpisodio(episodioId, 'ACTIVA'),
        [] as EvolucionResponse[],
        'Evoluciones',
      ),
      medicamentos: this.conRespaldo(
        forkJoin([
          this.servicioMedicamento.getIndicacionesPorEpisodio(episodioId, 'ACTIVO'),
          this.servicioMedicamento.getIndicacionesPorEpisodio(episodioId, 'FINALIZADO'),
        ]).pipe(map(([activos, finalizados]) => [...activos, ...finalizados])),
        [] as MedicamentoIndicacionResponse[],
        'Indicaciones de medicamentos',
      ),
      cuidados: this.conRespaldo(
        forkJoin([
          this.servicioCuidado.buscarPorEpisodio(episodioId, 'EN_PROCESO'),
          this.servicioCuidado.buscarPorEpisodio(episodioId, 'COMPLETADO'),
        ]).pipe(map(([enProceso, completados]) => [...enProceso, ...completados])),
        [] as CuidadoResponse[],
        'Indicaciones de cuidados',
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
        'Procedimientos médicos',
      ),
      altas: this.conRespaldo(
        this.servicioAlta
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => item.estado === 'VIGENTE'))),
        [] as AltaResponse[],
        'Alta médica',
      ),
      signos: this.conRespaldo(
        this.servicioSignos
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as SignosVitalesResponse[],
        'Signos vitales',
      ),
      control: this.conRespaldo(
        this.servicioControl
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as ControlHidricoResponse[],
        'Control hídrico',
      ),
      glucosa: this.conRespaldo(
        this.servicioGlucosa
          .buscarPorEpisodio(episodioId)
          .pipe(map((items) => items.filter((item) => !item.eliminado))),
        [] as GlucosaResponse[],
        'Glucosa',
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
          if (solicitud !== this.solicitud) return;

          this.historiaClinica = this.ordenarPorFechaDesc(
            datos.historia,
            (item) => item.fecha,
          );
          this.examenFisico = this.ordenarPorFechaDesc(
            datos.examenFisico,
            (item) => item.fecha,
          );
          this.diagnosticos = this.ordenarPorFechaDesc(
            datos.diagnosticos,
            (item) => item.fecha,
          );
          this.evoluciones = this.ordenarPorFechaDesc(
            datos.evoluciones,
            (item) => item.fecha,
          );
          this.medicamentos = this.ordenarPorFechaDesc(
            datos.medicamentos,
            (item) => item.fechaInicio,
          );
          this.cuidados = this.ordenarPorFechaDesc(datos.cuidados, (item) => item.fechaInicio);
          this.examenes = this.ordenarPorFechaDesc(datos.examenes, (item) => item.fecha);
          this.procedimientos = this.ordenarPorFechaDesc(
            datos.procedimientos,
            (item) => item.inicio,
          );
          this.alta = datos.altas[0] ?? null;
          this.signosVitales = this.ordenarPorFechaDesc(datos.signos, (item) => item.fecha);
          this.controlHidrico = this.ordenarPorFechaDesc(datos.control, (item) => item.fecha);
          this.glucosa = this.ordenarPorFechaDesc(datos.glucosa, (item) => item.fecha);
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
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (solicitud !== this.solicitud) return;

          this.cargando = false;
          this.error = 'No se pudo cargar el resumen del episodio.';
          this.cdr.detectChanges();
        },
      });
  }

  private conRespaldo<T>(observable: Observable<T>, respaldo: T, seccion: string): Observable<T> {
    return observable.pipe(
      catchError(() => {
        this.seccionesConError = [...this.seccionesConError, seccion];
        return of(respaldo);
      }),
    );
  }

  fechaHoraIngreso(): string {
    return this.formatearFechaHora(this.episodio?.fechaHoraIngreso ?? null);
  }

  fechaHoraEgreso(): string {
    return this.formatearFechaHora(
      this.episodio?.fechaHoraEgreso ?? this.alta?.fechaHoraEgreso ?? null,
    );
  }

  fechaHora(valor: string | null | undefined): string {
    return this.formatearFechaHora(valor ?? null);
  }

  fecha(valor: string | null | undefined): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return `${this.dosDigitos(fecha.getDate())}-${this.dosDigitos(
      fecha.getMonth() + 1,
    )}-${fecha.getFullYear()}`;
  }

  private formatearFechaHora(valor: string | null): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return `${this.fecha(valor)} ${this.dosDigitos(fecha.getHours())}:${this.dosDigitos(
      fecha.getMinutes(),
    )}`;
  }

  private dosDigitos(valor: number): string {
    return `${valor}`.padStart(2, '0');
  }

  tipoAtencionLegible(tipo: TipoAtencion | null | undefined): string {
    if (tipo === 'HOSPITALIZACION') return 'Hospitalización';
    if (tipo === 'EMERGENCIA') return 'Emergencia';
    return '—';
  }

  sexoLegible(sexo: string | null | undefined): string {
    if (sexo === 'FEMENINO') return 'Femenino';
    if (sexo === 'MASCULINO') return 'Masculino';
    return '—';
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

  etiqueta(valor: string | null | undefined): string {
    if (!valor) return '—';
    const texto = valor.replaceAll('_', ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  textoDuracion(tipo: TipoDuracionApi | TipoDuracionCuidadoApi, dias: number | null): string {
    if (tipo === 'DOSIS_UNICA') return 'Dosis única';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'Tiempo indefinido';
    return `${dias ?? 0} ${dias === 1 ? 'día' : 'días'}`;
  }

  textoFrecuencia(frecuencia: number): string {
    return `Cada ${frecuencia} ${frecuencia === 1 ? 'hora' : 'horas'}`;
  }

  textoMedicamento(medicamento: MedicamentoIndicacionResponse): string {
    return (
      medicamento.medicamento?.trim() ||
      medicamento.medicamentoLibre?.trim() ||
      'Medicamento no registrado'
    );
  }

  textoRecursos(recursos: RecursoProcedimientoResponse[]): string {
    if (!recursos.length) return '—';
    return recursos.map((recurso) => `${recurso.nombre} (${recurso.cantidad})`).join(', ');
  }

  textoArchivos(examen: ExamenResponse): string {
    if (!examen.archivos.length) return 'Sin archivos';
    return `${examen.archivos.length} archivo(s)`;
  }

  textoLista(valores: { nombre: string }[]): string {
    return valores.length ? valores.map((valor) => valor.nombre).join(', ') : 'Ninguna';
  }
}
