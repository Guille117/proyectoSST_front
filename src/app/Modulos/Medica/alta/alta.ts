import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom, Subscription, timeout, TimeoutError } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_institucion } from '../../Catalogos/data/nombreInterfaz';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import { TIMEOUT_HTTP_MS } from '../evaluacion/data/constantes-clinicas';
import {
  CuidadoIndicacion,
  CuidadoTratamiento,
} from '../indicaciones/cuidados/cuidado-indicacion/cuidado-indicacion';
import {
  MedicamentoIndicacion,
  MedicamentoTratamiento,
  textoDuracion,
} from '../indicaciones/medicamentos/medicamento-indicacion/medicamento-indicacion';
import {
  ProcedimientoMedicoRequest,
  ProcedimientoMedicoResponse,
  TipoProcedimientoResponse,
} from '../procedimiento-medico/data/procedimientoMedicoInterfaz';
import { ProcedimientoMedicoService } from '../procedimiento-medico/data/procedimiento-medico-service';
import {
  AltaRequest,
  AltaResponse,
  AltaTratamientoRequest,
  AltaTratamientoResponse,
  CondicionEgresoResponse,
  TipoAltaApi,
  TipoDuracionApi,
} from './data/altaInterfaz';
import { AltaService } from './data/alta-service';

/** Horas durante las que se permite anular un alta después de su registro. */
const HORAS_PARA_ANULAR_ALTA = 5;
const MS_HORA = 60 * 60 * 1000;

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de la pantalla. */
/** Motivos de egreso que ofrece la pantalla de alta médica. */
type SeccionAlta = 'indicacion-medica' | 'retiro-voluntario' | 'referencia-traslado';

/** Persona que solicita el retiro voluntario. */
type ResponsableRetiro = '' | 'paciente' | 'persona-responsable';

/** Pestaña del tratamiento: medicamentos o cuidados. */
type TipoTratamiento = 'medicamentos' | 'cuidados';

interface SeccionVista {
  id: SeccionAlta;
  titulo: string;
  descripcion: string;
  icono: string;
}

/** Medicamento del tratamiento con la posición que ocupa mientras se edita. */
interface MedicamentoEnEdicion {
  indice: number;
  datos: MedicamentoTratamiento;
}

/** Cuidado del tratamiento con la posición que ocupa mientras se edita. */
interface CuidadoEnEdicion {
  indice: number;
  datos: CuidadoTratamiento;
}

/**
 * Alta médica del episodio: pantalla del módulo Médico con las secciones del egreso del paciente
 * (alta por indicación médica, retiro voluntario y referencia o traslado) y el registro del egreso.
 * El alta vigente se carga desde el backend, se registra o actualiza y puede anularse; al guardar,
 * el episodio queda cerrado. El tratamiento se guarda junto con el alta.
 */
@Component({
  selector: 'app-alta',
  imports: [FormsModule, DatosPaciente, MedicamentoIndicacion, CuidadoIndicacion, TabSwitch],
  templateUrl: './alta.html',
  styleUrl: './alta.scss',
})
export class Alta implements OnInit, OnDestroy {
  private readonly catalogoService = inject(CatalogoService);
  private readonly servicio = inject(AltaService);
  private readonly servicioProcedimientos = inject(ProcedimientoMedicoService);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionInstituciones?: Subscription;
  private peticionCondiciones?: Subscription;
  private peticionAlta?: Subscription;
  private peticionAccion?: Subscription;
  private tiposSolicitud?: TipoProcedimientoResponse[];
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Sección del egreso elegida en el panel de secciones. */
  seccionActiva: SeccionAlta = 'indicacion-medica';

  /** Longitud máxima de la observación del egreso. */
  readonly maxCaracteres = 1000;

  /** Campos del registro del egreso: diagnóstico, condición y observación. */
  diagnosticoEgreso = '';
  condicionEgreso = '';
  observacionEgreso = '';

  /** Campos propios del retiro voluntario. */
  responsableRetiro: ResponsableRetiro = '';
  motivoRetiro = '';
  riesgosRetiro: string[] = [];
  riesgoRetiro = '';

  /** Campos propios de la referencia o traslado. */
  instituciones: Inter_institucion[] = [];
  institucionReferencia = '';
  motivoReferencia = '';
  indicacionesTraslado = '';

  /** Condiciones de egreso que ofrece el catálogo. */
  condicionesEgreso: CondicionEgresoResponse[] = [];

  /** Alta vigente del episodio; null cuando todavía no se ha registrado. */
  altaExistente: AltaResponse | null = null;

  /** La ventana del tratamiento ocupa el lugar del registro del egreso. */
  mostrandoTratamiento = false;

  /** Pestaña del tratamiento que se está capturando. */
  tipoTratamiento: TipoTratamiento = 'medicamentos';

  /** Medicamentos agregados al tratamiento del egreso. */
  tratamientoMedicamentos: MedicamentoTratamiento[] = [];

  /** Cuidados agregados al tratamiento del egreso. */
  tratamientoCuidados: CuidadoTratamiento[] = [];

  /** Medicamento cargado en el formulario para corregirlo; null al capturar uno nuevo. */
  medicamentoEnEdicion: MedicamentoEnEdicion | null = null;

  /** Cuidado cargado en el formulario para corregirlo; null al capturar uno nuevo. */
  cuidadoEnEdicion: CuidadoEnEdicion | null = null;

  /** La ficha del paciente ocupa el panel derecho y se alterna con las tarjetas del tratamiento. */
  pacienteAbierto = true;

  /** El cuerpo de la ficha del paciente está desplegado. */
  cuerpoPacienteVisible = true;

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  anulando = false;
  confirmando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  // ------------------- SECCIONES DEL EGRESO -------------------
  /** Secciones del egreso del paciente, en el orden en que las muestra la pantalla. */
  secciones: SeccionVista[] = [
    {
      id: 'indicacion-medica',
      titulo: 'Alta por indicación médica',
      descripcion: 'Egreso indicado por el médico.',
      icono: 'bi-person',
    },
    {
      id: 'retiro-voluntario',
      titulo: 'Retiro voluntario',
      descripcion: 'Salida por decisión del paciente.',
      icono: 'bi-box-arrow-right',
    },
    {
      id: 'referencia-traslado',
      titulo: 'Referencia / traslado',
      descripcion: 'Traslado a otro centro o servicio.',
      icono: 'bi-arrow-left-right',
    },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarCondiciones();
    this.cargarInstituciones();
    this.cargarAlta();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionInstituciones?.unsubscribe();
    this.peticionCondiciones?.unsubscribe();
    this.peticionAlta?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  // ------------------- CARGA DE CATÁLOGOS -------------------
  /** Carga del catálogo las condiciones de egreso activas. */
  private cargarCondiciones(): void {
    if (this.destruido) return;

    this.peticionCondiciones?.unsubscribe();
    this.peticionCondiciones = this.catalogoService
      .listar<CondicionEgresoResponse>('condicionesEgreso', true)
      .pipe(timeout(TIMEOUT_HTTP_MS))
      .subscribe({
        next: (condiciones) => {
          if (this.destruido) return;
          this.condicionesEgreso = condiciones;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido) return;
          this.mostrarError(
            error,
            'No se pudieron cargar las condiciones de egreso.',
          );
        },
      });
  }

  /** Carga del catálogo las instituciones activas para la referencia o el traslado. */
  private cargarInstituciones(): void {
    if (this.destruido) return;

    this.peticionInstituciones?.unsubscribe();
    this.peticionInstituciones = this.catalogoService
      .listar<Inter_institucion>('instituciones', true)
      .pipe(timeout(TIMEOUT_HTTP_MS))
      .subscribe({
        next: (instituciones) => {
          if (this.destruido) return;
          this.instituciones = instituciones;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido) return;
          this.mostrarError(
            error,
            'No se pudieron cargar las instituciones de referencia.',
          );
        },
      });
  }

  // ------------------- CARGA DEL ALTA -------------------
  /** Carga el alta vigente del episodio activo y rellena el registro. */
  cargarAlta(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;
    this.errorCarga = false;

    if (episodioId === null) {
      this.cargando = false;
      this.altaExistente = null;
      this.limpiarTodo();
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.cdr.markForCheck();
    this.peticionAlta?.unsubscribe();
    this.peticionAlta = this.servicio
      .buscarPorEpisodio(episodioId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuestas) => {
          if (this.destruido) return;

          const alta = respuestas[0] ?? null;
          if (alta) {
            this.aFormulario(alta);
          } else {
            this.altaExistente = null;
            this.limpiarTodo();
          }
        },
        error: (error) => {
          if (this.destruido) return;

          this.altaExistente = null;
          this.errorCarga = true;
          this.mostrarError(
            error,
            'No se pudo cargar el alta del episodio.',
          );
        },
      });
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** La sección activa es el retiro voluntario, que añade sus propios campos al registro. */
  get esRetiroVoluntario(): boolean {
    return this.seccionActiva === 'retiro-voluntario';
  }

  /** La sección activa es la referencia o traslado, con sus propios campos. */
  get esReferenciaTraslado(): boolean {
    return this.seccionActiva === 'referencia-traslado';
  }

  /** El registro del egreso se divide en dos columnas en el retiro y en la referencia. */
  get formularioDividido(): boolean {
    return this.esRetiroVoluntario || this.esReferenciaTraslado;
  }

  /** El registro exige el diagnóstico y, según la sección, sus campos obligatorios. */
  get puedeGuardar(): boolean {
    if (
      this.destruido ||
      this.guardando ||
      this.anulando ||
      this.confirmando ||
      this.cargando
    ) {
      return false;
    }

    if (this.diagnosticoEgreso.trim().length === 0) return false;

    if (this.esRetiroVoluntario) {
      return this.responsableRetiro !== '' && this.motivoRetiro.trim().length > 0;
    }

    if (this.esReferenciaTraslado) {
      return this.institucionReferencia !== '' && this.motivoReferencia.trim().length > 0;
    }

    return true;
  }

  /** Hay tratamiento cargado: la ficha del paciente se contrae y cede su lugar a las tarjetas. */
  get hayTratamiento(): boolean {
    return this.tratamientoMedicamentos.length > 0 || this.tratamientoCuidados.length > 0;
  }

  /** La pestaña activa del tratamiento es la de medicamentos. */
  get esTratamientoMedicamentos(): boolean {
    return this.tipoTratamiento === 'medicamentos';
  }

  /** La ficha del paciente ocupa el panel derecho; sin tratamiento permanece siempre visible. */
  get pacienteVisible(): boolean {
    return !this.hayTratamiento || this.pacienteAbierto;
  }

  /** Las tarjetas del tratamiento ocupan el panel derecho cuando la ficha está contraída. */
  get tratamientoVisible(): boolean {
    return this.hayTratamiento && !this.pacienteAbierto;
  }

  /** El cuerpo de la ficha se dibuja desplegado mientras no haya tratamiento. */
  get cuerpoPacienteExpandido(): boolean {
    return !this.hayTratamiento || this.cuerpoPacienteVisible;
  }

  /** Cantidad total de indicaciones del tratamiento. */
  get totalTratamiento(): number {
    return this.tratamientoMedicamentos.length + this.tratamientoCuidados.length;
  }

  /** Hay un alta vigente cargada: se puede anular o actualizar. */
  get hayAltaExistente(): boolean {
    return this.altaExistente !== null;
  }

  /** El alta todavía está dentro de las horas permitidas para anularla. */
  get puedeAnularAlta(): boolean {
    const alta = this.altaExistente;
    if (!alta) return false;

    const egreso = new Date(alta.fechaHoraEgreso).getTime();
    if (Number.isNaN(egreso)) return false;

    const transcurrido = Date.now() - egreso;
    return transcurrido >= 0 && transcurrido <= HORAS_PARA_ANULAR_ALTA * MS_HORA;
  }

  /**
   * Texto de la duración de un medicamento del tratamiento; el listado de lo agregado lo describe con
   * el mismo texto del formulario de la tarjeta de medicamentos.
   */
  protected readonly duracionDelMedicamento = textoDuracion;

  /** Texto de la realización de un cuidado del tratamiento. */
  textoCuidado(cuidado: CuidadoTratamiento): string {
    if (cuidado.duracionTipo === 'unica') {
      return 'Realizar una vez';
    }

    const frecuencia = cuidado.frecuencia ?? 0;
    const cada = `Realizar cada ${frecuencia} ${frecuencia === 1 ? 'hora' : 'horas'}`;

    if (cuidado.duracionTipo === 'dias') {
      const dias = cuidado.duracionCantidad ?? 0;
      return `${cada} por ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }

    if (cuidado.duracionTipo === 'indefinida') {
      return `${cada} por tiempo indefinido`;
    }

    return cada;
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Marca la tarjeta pulsada como la sección del egreso elegida. */
  seleccionarSeccion(id: SeccionAlta): void {
    this.seccionActiva = id;
  }

  /** Descarta lo capturado y deja el registro como estaba en el alta guardada. */
  cancelarCaptura(): void {
    if (this.altaExistente) {
      this.aFormulario(this.altaExistente);
      return;
    }

    this.limpiarFormularioEgreso();
  }

  /** Agrega a la lista el riesgo escrito, sin repetir los que ya están registrados. */
  agregarRiesgoRetiro(): void {
    const riesgo = this.riesgoRetiro.trim();

    if (!riesgo) return;
    if (
      this.riesgosRetiro.some(
        (registrado) => registrado.toLowerCase() === riesgo.toLowerCase(),
      )
    ) {
      this.riesgoRetiro = '';
      return;
    }

    this.riesgosRetiro = [...this.riesgosRetiro, riesgo];
    this.riesgoRetiro = '';
  }

  /** Quita de la lista el riesgo indicado por su posición. */
  quitarRiesgoRetiro(indice: number): void {
    this.riesgosRetiro = this.riesgosRetiro.filter((_, posicion) => posicion !== indice);
  }

  /** Abre la ventana del tratamiento en el lugar del registro del egreso. */
  agregarTratamiento(): void {
    this.mostrandoTratamiento = true;
    this.tipoTratamiento = 'medicamentos';
    this.limpiarEdicionTratamiento();
  }

  /** Vuelve al registro del egreso sin cerrar el tratamiento ya agregado. */
  volverAlFormularioInicio(): void {
    this.mostrandoTratamiento = false;
    this.limpiarEdicionTratamiento();
  }

  /** Cambia entre la pestaña de medicamentos y la de cuidados. */
  cambiarTipoTratamiento(esMedicamento: boolean): void {
    this.tipoTratamiento = esMedicamento ? 'medicamentos' : 'cuidados';
    this.limpiarEdicionTratamiento();
  }

  /** Suma al tratamiento el medicamento capturado o reemplaza el que se está editando. */
  registrarMedicamento(medicamento: MedicamentoTratamiento): void {
    const edicion = this.medicamentoEnEdicion;

    this.tratamientoMedicamentos = edicion
      ? this.tratamientoMedicamentos.map((registrado, indice) =>
          indice === edicion.indice ? medicamento : registrado,
        )
      : [...this.tratamientoMedicamentos, medicamento];

    if (!edicion) this.pacienteAbierto = false;
    this.medicamentoEnEdicion = null;
  }

  /** Suma al tratamiento el cuidado capturado o reemplaza el que se está editando. */
  registrarCuidado(cuidado: CuidadoTratamiento): void {
    const edicion = this.cuidadoEnEdicion;

    this.tratamientoCuidados = edicion
      ? this.tratamientoCuidados.map((registrado, indice) =>
          indice === edicion.indice ? cuidado : registrado,
        )
      : [...this.tratamientoCuidados, cuidado];

    if (!edicion) this.pacienteAbierto = false;
    this.cuidadoEnEdicion = null;
  }

  /** Carga en el formulario el medicamento pulsado y abre la pestaña de medicamentos. */
  editarMedicamento(indice: number): void {
    this.tipoTratamiento = 'medicamentos';
    this.mostrandoTratamiento = true;
    this.cuidadoEnEdicion = null;
    this.medicamentoEnEdicion = {
      indice,
      datos: { ...this.tratamientoMedicamentos[indice] },
    };
  }

  /** Carga en el formulario el cuidado pulsado y abre la pestaña de cuidados. */
  editarCuidado(indice: number): void {
    this.tipoTratamiento = 'cuidados';
    this.mostrandoTratamiento = true;
    this.medicamentoEnEdicion = null;
    this.cuidadoEnEdicion = {
      indice,
      datos: { ...this.tratamientoCuidados[indice] },
    };
  }

  /** Quita del tratamiento el medicamento indicado por su posición en el listado. */
  quitarMedicamento(indice: number): void {
    this.tratamientoMedicamentos = this.tratamientoMedicamentos.filter(
      (_, posicion) => posicion !== indice,
    );
    this.medicamentoEnEdicion = null;
  }

  /** Quita del tratamiento el cuidado indicado por su posición en el listado. */
  quitarCuidado(indice: number): void {
    this.tratamientoCuidados = this.tratamientoCuidados.filter(
      (_, posicion) => posicion !== indice,
    );
    this.cuidadoEnEdicion = null;
  }

  /** Descarta los datos de edición y deja los formularios listos para una captura nueva. */
  cancelarCapturaTratamiento(): void {
    this.limpiarEdicionTratamiento();
  }

  /** Abre la ficha del paciente o vuelve a las tarjetas del tratamiento, según su estado. */
  cambiarPanelPaciente(abierto: boolean): void {
    if (!this.hayTratamiento) return;

    this.pacienteAbierto = abierto;

    if (abierto) {
      this.cuerpoPacienteVisible = true;
    }
  }

  /** Pliega o despliega el cuerpo de la ficha sin ocultar su panel. */
  cambiarCuerpoPaciente(visible: boolean): void {
    if (!this.hayTratamiento) return;

    this.cuerpoPacienteVisible = visible;
  }

  // ------------------- GUARDADO Y ANULACIÓN -------------------
  /**
   * Registra el alta o actualiza la vigente. El cuerpo lleva el episodio, el usuario de la sesión y
   * los campos de la sección; al guardar, el backend cierra el episodio.
   */
  async guardarEgreso(): Promise<void> {
    if (this.destruido || this.guardando || this.anulando || this.confirmando) return;

    if (!this.puedeGuardar) {
      this.avisarValidacion();
      return;
    }

    const episodioId = this.altaExistente?.episodioId ?? this.episodioActivo.obtener();
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

    const idEditado = this.altaExistente?.id ?? null;

    if (idEditado !== null) {
      const fecha = this.formatearFecha(this.altaExistente?.fechaHoraEgreso ?? '');
      const mensaje = fecha
        ? `¿Está seguro de guardar los cambios del alta del ${fecha}?`
        : '¿Está seguro de guardar los cambios del alta?';

      this.confirmando = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps.confirmarToast(mensaje).catch(() => false);
      this.confirmando = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
    }

    const cuerpo = this.construirRequest(episodioId, usuarioId);

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();

    let solicitudFarmacia: ProcedimientoMedicoResponse | null = null;

    try {
      // La solicitud debe crearse antes del alta: al guardarla, el backend cierra el episodio.
      if (idEditado === null) {
        solicitudFarmacia = await this.crearSolicitudFarmacia(episodioId, usuarioId);
        if (this.destruido) return;
      }

      let respuesta: AltaResponse;
      try {
        respuesta = await firstValueFrom(
          idEditado === null
            ? this.servicio.crear(cuerpo)
            : this.servicio.actualizar(idEditado, cuerpo),
        );
      } catch (error) {
        if (solicitudFarmacia) await this.cancelarSolicitudFarmacia(solicitudFarmacia.id);
        if (!this.destruido) {
          this.mostrarError(error, 'No se pudo guardar el alta. Intente nuevamente.');
        }
        return;
      }

      if (this.destruido) return;

      this.aFormulario(respuesta);
      this.episodioActivo.limpiar();
      this.sinEpisodioActivo = false;
      this.popUps.exito(
        idEditado === null
          ? solicitudFarmacia
            ? 'Alta registrada exitosamente. Solicitud de medicamento enviada a farmacia.'
            : 'Alta registrada exitosamente.'
          : 'Alta actualizada exitosamente.',
      );
    } finally {
      this.guardando = false;
      if (!this.destruido) this.cdr.markForCheck();
    }
  }

  /** Crea una única solicitud de farmacia con todos los medicamentos de catálogo del alta. */
  private async crearSolicitudFarmacia(
    episodioId: number,
    usuarioId: number,
  ): Promise<ProcedimientoMedicoResponse | null> {
    const recursos = this.tratamientoMedicamentos
      .filter(
        (medicamento) =>
          medicamento.medicamentoLogId !== null && (medicamento.cantidad ?? 0) > 0,
      )
      .map((medicamento) => ({
        referenciaId: medicamento.medicamentoLogId!,
        cantidad: medicamento.cantidad!,
      }));

    if (!recursos.length) return null;

    const tipo = await this.obtenerTipoSolicitudFarmacia();
    if (!tipo) return null;

    const request: ProcedimientoMedicoRequest = {
      tipoProcedimientoId: tipo.id,
      descripcion: 'Solicitud de medicamento a farmacia',
      resultado: null,
      inicio: this.fechaHoraActual(),
      fin: null,
      episodioId,
      usuarioId,
      recursos: recursos.map((recurso) => ({
        tipo: 'MEDICAMENTO' as const,
        referenciaId: recurso.referenciaId,
        cantidad: recurso.cantidad,
      })),
    };

    try {
      return await firstValueFrom(this.servicioProcedimientos.crearProcedimiento(request));
    } catch (error) {
      if (!this.destruido) {
        this.mostrarError(
          error,
          'No se pudo generar la solicitud de medicamento a farmacia.',
        );
      }
      return null;
    }
  }

  /** Tipo de procedimiento con el que se envían las solicitudes a farmacia. */
  private async obtenerTipoSolicitudFarmacia(): Promise<TipoProcedimientoResponse | null> {
    let tipos = this.tiposSolicitud;

    if (!tipos) {
      try {
        tipos = await firstValueFrom(this.servicioProcedimientos.getTiposProcedimiento());
        this.tiposSolicitud = tipos;
      } catch (error) {
        if (!this.destruido) {
          this.mostrarError(error, 'No se pudieron consultar los tipos de solicitud.');
        }
        return null;
      }
    }

    const activos = tipos.filter((tipo) => tipo.estado !== false);
    const tipo =
      activos.find(
        (opcion) => /solicitud/i.test(opcion.nombre) && /medicamento/i.test(opcion.nombre),
      ) ??
      activos.find((opcion) => /solicitud/i.test(opcion.nombre)) ??
      activos.find((opcion) => /medicamento/i.test(opcion.nombre)) ??
      null;

    if (!tipo) {
      this.popUps.advertencia(
        'No hay un tipo de solicitud de medicamento configurado en el catálogo de procedimientos.',
      );
    }

    return tipo;
  }

  /** Cancela el procedimiento si el alta no pudo guardarse después de crear la solicitud. */
  private async cancelarSolicitudFarmacia(procedimientoId: number): Promise<void> {
    try {
      await firstValueFrom(this.servicioProcedimientos.eliminarProcedimiento(procedimientoId));
    } catch (error) {
      if (!this.destruido) {
        this.mostrarError(error, 'No se pudo cancelar la solicitud de farmacia generada.');
      }
    }
  }

  /** Anula el alta vigente y reabre el episodio; la operación se confirma con el popup global. */
  async anularAlta(): Promise<void> {
    if (this.destruido || !this.altaExistente || this.anulando || this.guardando || this.confirmando) {
      return;
    }

    if (!this.puedeAnularAlta) {
      this.popUps.advertencia('El plazo de 5 horas para anular el alta venció.');
      return;
    }

    const alta = this.altaExistente;
    const fecha = this.formatearFecha(alta.fechaHoraEgreso);
    const mensaje = fecha
      ? `¿Está seguro de anular el alta del ${fecha}?`
      : '¿Está seguro de anular el alta?';

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps.confirmarToast(mensaje).catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.anulando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .anular(alta.id)
      .pipe(
        finalize(() => {
          this.anulando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          const episodioId = alta.episodioId;
          this.limpiarTodo();
          this.episodioActivo.guardar(episodioId);
          this.sinEpisodioActivo = false;
          this.popUps.exito('Alta anulada exitosamente.');
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo anular el alta. Intente nuevamente.');
        },
      });
  }

  // ------------------- APOYO -------------------
  /** Construye el cuerpo que espera el backend a partir del registro actual. */
  private construirRequest(episodioId: number, usuarioId: number): AltaRequest {
    return {
      tipoAlta: this.aTipoAltaApi(this.seccionActiva),
      diagnosticoEgreso: this.diagnosticoEgreso.trim(),
      condicionEgresoId: this.aIdCatalogo(this.condicionEgreso),
      observacionEgreso: this.observacionEgreso.trim() || null,
      episodioId,
      usuarioId,
      responsableRetiro: this.esRetiroVoluntario
        ? this.aResponsableApi(this.responsableRetiro)
        : null,
      motivoRetiro: this.esRetiroVoluntario
        ? this.motivoRetiro.trim() || null
        : null,
      riesgosRetiro: this.esRetiroVoluntario ? [...this.riesgosRetiro] : [],
      institucionId: this.esReferenciaTraslado
        ? this.aIdCatalogo(this.institucionReferencia)
        : null,
      motivoReferencia: this.esReferenciaTraslado
        ? this.motivoReferencia.trim() || null
        : null,
      indicacionesTraslado: this.esReferenciaTraslado
        ? this.indicacionesTraslado.trim() || null
        : null,
      tratamientos: this.mapTratamientos(),
    };
  }

  /** Rellena el registro con el alta que devuelve el backend. */
  private aFormulario(alta: AltaResponse): void {
    this.altaExistente = alta;
    this.seccionActiva = this.aSeccionVista(alta.tipoAlta);
    this.diagnosticoEgreso = alta.diagnosticoEgreso;
    this.condicionEgreso =
      alta.condicionEgresoId !== null ? String(alta.condicionEgresoId) : '';
    this.observacionEgreso = alta.observacionEgreso ?? '';
    this.responsableRetiro = this.aResponsableVista(alta.responsableRetiro);
    this.motivoRetiro = alta.motivoRetiro ?? '';
    this.riesgosRetiro = [...alta.riesgosRetiro];
    this.riesgoRetiro = '';
    this.institucionReferencia =
      alta.institucionId !== null ? String(alta.institucionId) : '';
    this.motivoReferencia = alta.motivoReferencia ?? '';
    this.indicacionesTraslado = alta.indicacionesTraslado ?? '';
    this.tratamientoMedicamentos = alta.tratamientos
      .filter((tratamiento) => tratamiento.tipo === 'MEDICAMENTO')
      .map((tratamiento) => this.aMedicamentoVista(tratamiento));
    this.tratamientoCuidados = alta.tratamientos
      .filter((tratamiento) => tratamiento.tipo === 'CUIDADO')
      .map((tratamiento) => this.aCuidadoVista(tratamiento));
    this.medicamentoEnEdicion = null;
    this.cuidadoEnEdicion = null;
    this.mostrandoTratamiento = false;
    this.pacienteAbierto = !this.hayTratamiento;
    this.cuerpoPacienteVisible = true;
    this.cdr.markForCheck();
  }

  /** Deja el registro del egreso limpio. */
  private limpiarFormularioEgreso(): void {
    this.diagnosticoEgreso = '';
    this.condicionEgreso = '';
    this.observacionEgreso = '';
    this.responsableRetiro = '';
    this.motivoRetiro = '';
    this.riesgosRetiro = [];
    this.riesgoRetiro = '';
    this.institucionReferencia = '';
    this.motivoReferencia = '';
    this.indicacionesTraslado = '';
  }

  /** Limpia el registro, el tratamiento y el alta cargada. */
  private limpiarTodo(): void {
    this.limpiarFormularioEgreso();
    this.tratamientoMedicamentos = [];
    this.tratamientoCuidados = [];
    this.medicamentoEnEdicion = null;
    this.cuidadoEnEdicion = null;
    this.mostrandoTratamiento = false;
    this.altaExistente = null;
    this.pacienteAbierto = true;
    this.cuerpoPacienteVisible = true;
  }

  /** Suelta los datos que estaban cargados en los formularios del tratamiento. */
  private limpiarEdicionTratamiento(): void {
    this.medicamentoEnEdicion = null;
    this.cuidadoEnEdicion = null;
  }

  private mapTratamientos(): AltaTratamientoRequest[] {
    const medicamentos: AltaTratamientoRequest[] = this.tratamientoMedicamentos.map(
      (medicamento) => ({
        tipo: 'MEDICAMENTO',
        nombre: medicamento.nombre,
        medicamentoLogId: medicamento.medicamentoLogId ?? null,
        medicamentoLibre: medicamento.medicamentoLibre?.trim() || null,
        cantidad: medicamento.cantidad,
        unidadMedida: medicamento.unidadMedida.trim() || null,
        frecuencia: medicamento.frecuencia!,
        duracionTipo: this.aDuracionApi(medicamento.duracionTipo),
        duracion:
          medicamento.duracionTipo === 'dias' ? medicamento.duracionCantidad : null,
        observaciones: medicamento.observaciones.trim() || null,
      }),
    );

    const cuidados: AltaTratamientoRequest[] = this.tratamientoCuidados.map(
      (cuidado) => ({
        tipo: 'CUIDADO',
        nombre: cuidado.nombre,
        medicamentoLogId: null,
        medicamentoLibre: null,
        cantidad: null,
        unidadMedida: null,
        frecuencia: cuidado.frecuencia!,
        duracionTipo: this.aDuracionApi(cuidado.duracionTipo),
        duracion: cuidado.duracionTipo === 'dias' ? cuidado.duracionCantidad : null,
        observaciones: cuidado.observaciones.trim() || null,
      }),
    );

    return [...medicamentos, ...cuidados];
  }

  private aMedicamentoVista(
    tratamiento: AltaTratamientoResponse,
  ): MedicamentoTratamiento {
    return {
      nombre: tratamiento.nombre,
      medicamentoLogId: tratamiento.medicamentoLogId,
      medicamentoLibre: tratamiento.medicamentoLibre ?? '',
      cantidad: tratamiento.cantidad,
      unidadMedida: tratamiento.unidadMedida ?? '',
      frecuencia: tratamiento.frecuencia,
      duracionTipo: this.aDuracionVista(tratamiento.duracionTipo),
      duracionCantidad: tratamiento.duracion,
      observaciones: tratamiento.observaciones ?? '',
    };
  }

  private aCuidadoVista(tratamiento: AltaTratamientoResponse): CuidadoTratamiento {
    return {
      nombre: tratamiento.nombre,
      frecuencia: tratamiento.frecuencia,
      duracionTipo: this.aDuracionVista(tratamiento.duracionTipo),
      duracionCantidad: tratamiento.duracion,
      observaciones: tratamiento.observaciones ?? '',
    };
  }

  private aTipoAltaApi(seccion: SeccionAlta): TipoAltaApi {
    if (seccion === 'retiro-voluntario') return 'RETIRO_VOLUNTARIO';
    if (seccion === 'referencia-traslado') return 'REFERENCIA_TRASLADO';
    return 'INDICACION_MEDICA';
  }

  private aSeccionVista(tipo: TipoAltaApi): SeccionAlta {
    if (tipo === 'RETIRO_VOLUNTARIO') return 'retiro-voluntario';
    if (tipo === 'REFERENCIA_TRASLADO') return 'referencia-traslado';
    return 'indicacion-medica';
  }

  private aResponsableApi(
    responsable: ResponsableRetiro,
  ): 'PACIENTE' | 'PERSONA_RESPONSABLE' | null {
    if (responsable === 'paciente') return 'PACIENTE';
    if (responsable === 'persona-responsable') return 'PERSONA_RESPONSABLE';
    return null;
  }

  private aResponsableVista(
    responsable: 'PACIENTE' | 'PERSONA_RESPONSABLE' | null,
  ): ResponsableRetiro {
    if (responsable === 'PACIENTE') return 'paciente';
    if (responsable === 'PERSONA_RESPONSABLE') return 'persona-responsable';
    return '';
  }

  private aDuracionApi(tipo: 'dias' | 'unica' | 'indefinida' | ''): TipoDuracionApi {
    if (tipo === 'unica') return 'DOSIS_UNICA';
    if (tipo === 'indefinida') return 'TIEMPO_INDEFINIDO';
    return 'DIAS';
  }

  private aDuracionVista(tipo: TipoDuracionApi): 'dias' | 'unica' | 'indefinida' {
    if (tipo === 'DOSIS_UNICA') return 'unica';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'indefinida';
    return 'dias';
  }

  private aIdCatalogo(valor: string): number | null {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** Fecha y hora local en el formato ISO que espera el backend. */
  private fechaHoraActual(): string {
    const ahora = new Date();
    const dosDigitos = (valor: number): string => `${valor}`.padStart(2, '0');

    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(
      ahora.getDate(),
    )}T${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}:00`;
  }

  private formatearFecha(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Avisa del campo que impide guardar cuando el registro se envía incompleto. */
  private avisarValidacion(): void {
    if (!this.diagnosticoEgreso.trim()) {
      this.popUps.advertencia('El diagnóstico de egreso es obligatorio.');
      return;
    }
    if (this.esRetiroVoluntario) {
      if (this.responsableRetiro === '') {
        this.popUps.advertencia('Seleccione el solicitante del retiro.');
        return;
      }
      if (!this.motivoRetiro.trim()) {
        this.popUps.advertencia('El motivo del retiro es obligatorio.');
        return;
      }
    }
    if (this.esReferenciaTraslado) {
      if (this.institucionReferencia === '') {
        this.popUps.advertencia('Seleccione la institución de referencia.');
        return;
      }
      if (!this.motivoReferencia.trim()) {
        this.popUps.advertencia('El motivo de referencia es obligatorio.');
      }
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
