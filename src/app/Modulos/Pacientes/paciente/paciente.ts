import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, of, TimeoutError, timeout } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { calcularFilasVisibles, FILAS_VISIBLES_POR_DEFECTO } from '../../../shared/paginacion/filas-visibles';
import { ModalService } from '../../../modal-principal/modal-service';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { AltaService } from '../../Medica/alta/data/alta-service';
import { AltaResponse, AltaTratamientoResponse, TipoAltaApi } from '../../Medica/alta/data/altaInterfaz';
import { Sexo } from '../../Usuarios/usu/data/usuarioInterfaz';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';
import { ConsumoEpisodioService } from './data/consumo-service';
import { ConsumoEpisodio } from './data/consumoInterfaz';
import { DocumentoAltaPdfService } from './data/documento-alta-pdf-service';
import { DocumentoAutorizacionPdfService } from './data/documento-autorizacion-pdf-service';
import { DocumentoEpisodioService } from './data/documento-episodio-service';
import {
  DatosDocumentoTratamiento,
  DocumentoTratamientoPdfService,
  TratamientoDocumento,
} from './data/documento-tratamiento-pdf-service';
import { DocumentoEpisodio, TipoDocumentoEpisodio } from './data/documentoInterfaz';
import { PacienteDetalle, PacienteResumido, TipoAtencion } from './data/pacienteInterfaz';
import { PacienteService } from './data/paciente-service';
import { UsuarioService } from '../../Usuarios/usu/data/usuario-service';
import { ProcedimientoMedicoService } from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import { ProcedimientoMedicoResponse } from '../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import { EpisodioResumen } from '../expediente/data/expedienteInterfaz';
import { ResumenEpisodio } from '../expediente/resumen-episodio/resumen-episodio';
import {
  DatosAutorizacionVista,
  ProcedimientoAutorizacionVista,
} from './visor-autorizacion/visor-autorizacion';

/** Secciones de la vista de documentación del paciente. */
type SeccionDocumentacion = 'tratamiento' | 'consumo' | 'resumen';

interface SeccionDocumentacionVista {
  id: SeccionDocumentacion;
  titulo: string;
  descripcion: string;
  icono: string;
}

/** Tratamiento del alta listo para la vista de documentación. */
interface TratamientoAltaVista {
  clave: string;
  nombre: string;
  cantidad: string;
  frecuencia: string;
  duracion: string;
  observaciones: string;
}

/** Fila de la sección Documentos del panel del paciente. */
interface FilaDocumentoVista {
  clave: string;
  etiqueta: string;
  tipo: TipoDocumentoEpisodio;
  procedimientoId: number | null;
  altaId: number | null;
  alta: AltaResponse | null;
  tituloGrupo: string | null;
}

@Component({
  selector: 'app-paciente',
  imports: [TabSwitch, Paginacion, DecimalPipe, ResumenEpisodio],
  templateUrl: './paciente.html',
  styleUrl: './paciente.scss',
})
export class Paciente implements OnInit {
  private readonly modalService = inject(ModalService);
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioDocumento = inject(DocumentoEpisodioService);
  private readonly servicioConsumo = inject(ConsumoEpisodioService);
  private readonly servicioPdf = inject(DocumentoTratamientoPdfService);
  private readonly servicioPdfAlta = inject(DocumentoAltaPdfService);
  private readonly servicioPdfAutorizacion = inject(DocumentoAutorizacionPdfService);
  private readonly servicioAlta = inject(AltaService);
  private readonly servicioUsuario = inject(UsuarioService);
  private readonly servicioProcedimientos = inject(ProcedimientoMedicoService);
  private readonly authService = inject(AuthService);
  private readonly archivoService = inject(ArchivoService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('panelTabla') private panelTabla?: ElementRef<HTMLElement>;

  // ------------------- LISTADO Y SELECCIÓN -------------------
  pacientes: PacienteResumido[] = [];
  pacienteSeleccionado: PacienteResumido | null = null;
  paginaActual = 1;
  cantidadMostrar = FILAS_VISIBLES_POR_DEFECTO;
  mostrarPacientes = true;

  detalle: PacienteDetalle | null = null;
  cargandoDetalle = false;
  errorDetalle = '';

  documentos: DocumentoEpisodio[] = [];
  cargandoDocumentos = false;
  errorDocumentos = '';
  subiendoTipo: TipoDocumentoEpisodio | null = null;

  /** Procedimientos y altas del episodio que alimentan las filas de Documentos. */
  procedimientosDocumento: ProcedimientoMedicoResponse[] = [];
  altasDocumento: AltaResponse[] = [];

  /** La vista de documentación ocupa la pantalla en lugar del listado y el detalle. */
  documentacionAbierta = false;

  /** El panel de detalle muestra el consumo del episodio en lugar de los datos del paciente. */
  vistaDetalleConsumo = false;

  /** Sección de documentación elegida. */
  seccionDocumentacion: SeccionDocumentacion = 'tratamiento';

  /** Medicamentos del alta del episodio consultado. */
  medicamentosAlta: TratamientoAltaVista[] = [];

  /** Cuidados del alta del episodio consultado. */
  cuidadosAlta: TratamientoAltaVista[] = [];

  cargandoTratamientos = false;
  errorTratamientos = '';
  generandoDocumento = false;
  generandoAutorizacion = false;
  generandoDocumentoId: string | null = null;

  /** Consumo del episodio: productos entregados y estancia en cama. */
  consumo: ConsumoEpisodio | null = null;
  cargandoConsumo = false;
  errorConsumo = '';

  /** Secciones disponibles en la vista de documentación. */
  readonly seccionesDocumentacion: SeccionDocumentacionVista[] = [
    {
      id: 'tratamiento',
      titulo: 'Tratamiento',
      descripcion: 'Medicamentos y cuidados indicados en el alta.',
      icono: 'bi-capsule',
    },
    {
      id: 'consumo',
      titulo: 'Detalle de consumo',
      descripcion: 'Medicamentos, insumos y camas utilizados durante la atención.',
      icono: 'bi-clipboard2-pulse',
    },
    {
      id: 'resumen',
      titulo: 'Resumen de episodio',
      descripcion: 'Datos generales del episodio clínico del paciente.',
      icono: 'bi-journal-text',
    },
  ];

  private filaSubida: FilaDocumentoVista | null = null;

  /** Etiquetas del tipo de atención del paciente. */
  protected readonly etiquetasTipo: Record<TipoAtencion, string> = {
    HOSPITALIZACION: 'Hospitalización',
    EMERGENCIA: 'Emergencia',
  };

  /** Etiquetas del sexo del paciente. */
  protected readonly etiquetasSexo: Record<Sexo, string> = {
    MASCULINO: 'Masculino',
    FEMENINO: 'Femenino',
  };

  /** Filas visibles de Documentos: una por autorización, alta, receta y la hoja de referencia. */
  get filasDocumento(): FilaDocumentoVista[] {
    const filas: FilaDocumentoVista[] = [];
    let tituloAutorizaciones = true;
    let tituloAltas = true;
    let tituloRecetas = true;

    for (const procedimiento of this.procedimientosDocumento) {
      if (!procedimiento.requiereAutorizacion) continue;
      filas.push({
        clave: `autorizacion-${procedimiento.id}`,
        etiqueta: `Autorización: ${procedimiento.tipoProcedimientoNombre}`,
        tipo: 'AUTORIZACION_PROCEDIMIENTO',
        procedimientoId: procedimiento.id,
        altaId: null,
        alta: null,
        tituloGrupo: tituloAutorizaciones ? 'Autorizaciones' : null,
      });
      tituloAutorizaciones = false;
    }

    for (const alta of this.altasDocumento) {
      filas.push({
        clave: `alta-${alta.id}`,
        etiqueta: this.etiquetaAlta(alta),
        tipo: 'ALTA_MEDICA',
        procedimientoId: null,
        altaId: alta.id,
        alta,
        tituloGrupo: tituloAltas ? 'Altas médicas' : null,
      });
      tituloAltas = false;
    }

    for (const alta of this.altasDocumento) {
      if (!alta.tratamientos.length) continue;
      filas.push({
        clave: `receta-${alta.id}`,
        etiqueta: 'Receta médica',
        tipo: 'RECETA',
        procedimientoId: null,
        altaId: alta.id,
        alta,
        tituloGrupo: tituloRecetas ? 'Recetas' : null,
      });
      tituloRecetas = false;
    }

    filas.push({
      clave: 'referencia',
      etiqueta: 'Hoja de referencia',
      tipo: 'REFERENCIA',
      procedimientoId: null,
      altaId: null,
      alta: null,
      tituloGrupo: 'Referencia',
    });

    return filas;
  }

  protected get archivosAceptados(): string {
    return this.archivoService.aceptados;
  }

  ngOnInit(): void {
    this.listarPacientes();
  }

  // ------------------- LISTAR PACIENTES -------------------
  listarPacientes(pacienteIdSeleccionado?: number): void {
    this.servicioPaciente
      .listarPacientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pacientes) => {
          this.pacientes = pacientes;
          const visibles = this.pacientesFiltrados;
          const seleccionado =
            visibles.find((paciente) => paciente.pacienteId === pacienteIdSeleccionado) ??
            visibles[0] ??
            null;
          this.paginaActual = this.paginaDelPaciente(seleccionado);
          this.seleccionarPaciente(seleccionado, true);
          this.cdr.detectChanges();
          this.ajustarCantidadMostrar();
        },
        error: (error) => {
          this.popUps.errorDesdeBackend(error, 'No se pudieron cargar los pacientes.');
          this.cdr.detectChanges();
        },
      });
  }

  // ------------------- SELECCIÓN DEL PACIENTE -------------------
  seleccionarPaciente(paciente: PacienteResumido | null, forzar = false): void {
    if (!paciente) {
      this.pacienteSeleccionado = null;
      this.detalle = null;
      this.documentos = [];
      this.medicamentosAlta = [];
      this.cuidadosAlta = [];
      this.errorTratamientos = '';
      this.consumo = null;
      this.errorConsumo = '';
      this.cargandoConsumo = false;
      this.vistaDetalleConsumo = false;
      this.procedimientosDocumento = [];
      this.altasDocumento = [];
      return;
    }
    if (!forzar && this.pacienteSeleccionado?.pacienteId === paciente.pacienteId) return;

    this.pacienteSeleccionado = paciente;
    this.detalle = null;
    this.documentos = [];
    this.medicamentosAlta = [];
    this.cuidadosAlta = [];
    this.errorTratamientos = '';
    this.consumo = null;
    this.errorConsumo = '';
    this.cargandoConsumo = false;
    this.vistaDetalleConsumo = false;
    this.procedimientosDocumento = [];
    this.altasDocumento = [];
    this.cargarDetalle(paciente);
    this.cargarDocumentos(paciente);
    this.cargarProcedimientosDocumento(paciente);
    this.cargarTratamientosAlta();
  }

  esSeleccionado(paciente: PacienteResumido): boolean {
    return this.pacienteSeleccionado?.pacienteId === paciente.pacienteId;
  }

  /** Sección de documentación que se muestra en el panel derecho. */
  get seccionDocumentacionActual(): SeccionDocumentacionVista {
    return (
      this.seccionesDocumentacion.find((seccion) => seccion.id === this.seccionDocumentacion) ??
      this.seccionesDocumentacion[0]
    );
  }

  /** Episodio que se muestra en la sección Resumen de episodio. */
  get episodioIdDocumentacion(): number | null {
    return this.pacienteSeleccionado?.episodioId ?? this.pacienteSeleccionado?.ultimoEpisodioId ?? null;
  }

  /** Datos del episodio actual para la cabecera del resumen. */
  get episodioDocumentacion(): EpisodioResumen | null {
    const episodioId = this.episodioIdDocumentacion;
    const detalle = this.detalle;
    if (!detalle || episodioId === null) return null;

    return {
      episodioId,
      tipoAtencion:
        detalle.tipoAtencion ?? this.pacienteSeleccionado?.tipoTratamiento ?? 'EMERGENCIA',
      fechaHoraIngreso: detalle.fechaHoraIngreso ?? '',
      fechaHoraEgreso: null,
      medicoNombre: detalle.medicoNombre,
      activo: detalle.episodioId !== null,
    };
  }

  /** Abre la vista de documentación del paciente seleccionado. */
  abrirDocumentacion(): void {
    if (!this.pacienteSeleccionado) return;

    this.documentacionAbierta = true;
    this.seccionDocumentacion = 'tratamiento';
    this.cargarTratamientosAlta();
  }

  /** Muestra el consumo del episodio dentro del panel de detalle. */
  abrirDetalleConsumo(): void {
    if (!this.pacienteSeleccionado) return;

    this.vistaDetalleConsumo = true;
    this.seccionDocumentacion = 'consumo';
    this.cargarConsumo();
  }

  /** Vuelve del consumo a los datos del paciente en el mismo panel. */
  volverDetallePaciente(): void {
    this.vistaDetalleConsumo = false;
  }

  /** Vuelve al listado y al detalle del paciente. */
  cerrarDocumentacion(): void {
    this.documentacionAbierta = false;
  }

  /** Muestra la sección elegida de la documentación. */
  seleccionarSeccionDocumentacion(seccion: SeccionDocumentacion): void {
    this.seccionDocumentacion = seccion;
    if (seccion === 'consumo') this.cargarConsumo();
  }

  /** Vuelve a consultar el alta del paciente seleccionado. */
  recargarTratamientosAlta(): void {
    this.cargarTratamientosAlta();
  }

  /** Vuelve a consultar el consumo del episodio. */
  recargarConsumo(): void {
    this.cargarConsumo();
  }

  /** Carga los productos y la estancia en cama del episodio seleccionado. */
  private cargarConsumo(): void {
    const paciente = this.pacienteSeleccionado;
    if (!paciente) return;

    const episodioId = paciente.episodioId ?? paciente.ultimoEpisodioId;
    this.errorConsumo = '';

    if (episodioId === null) {
      this.consumo = null;
      this.cargandoConsumo = false;
      return;
    }

    this.cargandoConsumo = true;
    this.servicioConsumo
      .obtenerConsumo(episodioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (consumo) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.consumo = consumo;
          this.cargandoConsumo = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.consumo = null;
          this.cargandoConsumo = false;
          this.errorConsumo = this.mensajeError(
            error,
            'No se pudo cargar el detalle de consumo.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  /** Genera el PDF del tratamiento del alta con los datos del paciente y del médico. */
  async generarDocumento(): Promise<void> {
    if (this.generandoDocumento) return;

    const paciente = this.pacienteSeleccionado;
    if (!paciente) return;

    if (!this.medicamentosAlta.length && !this.cuidadosAlta.length) {
      this.popUps.advertencia('No hay tratamientos registrados para generar el documento.');
      return;
    }

    this.generandoDocumento = true;
    this.cdr.detectChanges();

    try {
      const detalle =
        this.detalle ??
        (await firstValueFrom(this.servicioPaciente.obtenerPaciente(paciente.pacienteId)));

      if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
      if (!this.detalle) this.detalle = detalle;

      const especialidad = await this.obtenerEspecialidadMedico(detalle.medicoId);

      await this.servicioPdf.generar({
        paciente: {
          nombre: detalle.nombreCompleto || paciente.nombreCompleto,
          cui: detalle.cui?.trim() || paciente.cui?.trim() || null,
          sexo: this.sexoLegible(detalle.sexo),
          edad: detalle.edad === null ? '—' : `${detalle.edad} años`,
          direccion: detalle.direccion?.trim() || '—',
        },
        medicamentos: this.medicamentosAlta,
        cuidados: this.cuidadosAlta,
        medico: {
          nombre: detalle.medicoNombre?.trim() || 'No registrado',
          especialidad,
        },
      });
    } catch (error) {
      this.popUps.error(this.mensajeError(error, 'No se pudo generar el documento.'));
    } finally {
      this.generandoDocumento = false;
      this.cdr.detectChanges();
    }
  }

  /** Nombres de todos los médicos asignados al paciente para la ficha. */
  nombresMedicos(datos: PacienteDetalle): string {
    const nombres = (datos.medicos ?? []).map((medico) => `Dr. ${medico.nombreCompleto}`);
    if (nombres.length) return nombres.join(', ');
    return datos.medicoNombre ? `Dr. ${datos.medicoNombre}` : '-';
  }

  /** Obtiene la especialidad del médico asignado desde el catálogo de médicos. */
  private async obtenerEspecialidadMedico(medicoId: number | null): Promise<string> {
    if (!medicoId) return '—';

    try {
      const medicos = await firstValueFrom(this.servicioUsuario.getMedicos().pipe(timeout(5000)));
      return medicos.find((medico) => medico.id === medicoId)?.especialidad?.trim() || '—';
    } catch {
      return '—';
    }
  }

  /**
   * Carga los tratamientos del alta del episodio activo o del último episodio del paciente.
   * La vista de documentación solo muestra los tratamientos registrados en el alta.
   */
  private cargarTratamientosAlta(): void {
    const paciente = this.pacienteSeleccionado;
    if (!paciente) return;

    const episodioId = paciente.episodioId ?? paciente.ultimoEpisodioId;
    this.errorTratamientos = '';

    if (episodioId === null) {
      this.medicamentosAlta = [];
      this.cuidadosAlta = [];
      this.cargandoTratamientos = false;
      return;
    }

    this.cargandoTratamientos = true;
    this.servicioAlta
      .buscarPorEpisodio(episodioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (altas) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;

          const tratamientos = altas[0]?.tratamientos ?? [];
          this.altasDocumento = altas;
          this.medicamentosAlta = tratamientos
            .filter((tratamiento) => tratamiento.tipo === 'MEDICAMENTO')
            .map((tratamiento, indice) => this.aTratamientoAltaVista(tratamiento, indice));
          this.cuidadosAlta = tratamientos
            .filter((tratamiento) => tratamiento.tipo === 'CUIDADO')
            .map((tratamiento, indice) => this.aTratamientoAltaVista(tratamiento, indice));
          this.cargandoTratamientos = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;

          this.medicamentosAlta = [];
          this.cuidadosAlta = [];
          this.altasDocumento = [];
          this.cargandoTratamientos = false;
          this.errorTratamientos = this.mensajeError(
            error,
            'No se pudieron cargar los tratamientos del alta.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  private aTratamientoAltaVista(
    tratamiento: AltaTratamientoResponse,
    indice: number,
  ): TratamientoAltaVista {
    const cantidad = tratamiento.cantidad;
    const unidad = tratamiento.unidadMedida?.trim();
    const frecuencia = tratamiento.frecuencia;

    return {
      clave: `${tratamiento.tipo}-${indice}`,
      nombre: tratamiento.nombre,
      cantidad: cantidad === null ? '—' : `${cantidad}${unidad ? ` ${unidad}` : ''}`,
      frecuencia: frecuencia ? `Cada ${frecuencia} ${frecuencia === 1 ? 'hora' : 'horas'}` : '—',
      duracion: this.textoDuracionAlta(tratamiento),
      observaciones: tratamiento.observaciones?.trim() || '—',
    };
  }

  private textoDuracionAlta(tratamiento: AltaTratamientoResponse): string {
    if (tratamiento.duracionTipo === null) return '—';
    if (tratamiento.duracionTipo === 'DOSIS_UNICA') return 'Dosis única';
    if (tratamiento.duracionTipo === 'TIEMPO_INDEFINIDO') return 'Tiempo indefinido';

    const dias = tratamiento.duracion ?? 0;
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  /** Pacientes del tab seleccionado: activos o egresados. */
  get pacientesFiltrados(): PacienteResumido[] {
    return this.pacientes.filter((paciente) => {
      const esEgresado = paciente.episodioId === null && paciente.ultimoEpisodioId !== null;
      return this.mostrarPacientes ? !esEgresado : esEgresado;
    });
  }

  get pacientesPagina(): PacienteResumido[] {
    const inicio = (this.paginaActual - 1) * this.cantidadMostrar;
    return this.pacientesFiltrados.slice(inicio, inicio + this.cantidadMostrar);
  }

  /** Cambia entre pacientes activos y egresados. */
  cambiarFiltroPacientes(mostrarPacientes: boolean): void {
    if (this.mostrarPacientes === mostrarPacientes) return;

    this.mostrarPacientes = mostrarPacientes;
    this.paginaActual = 1;
    const primero = this.pacientesPagina[0] ?? null;
    this.seleccionarPaciente(primero, true);
    this.cdr.detectChanges();
  }

  actualizarPagina(pagina: number): void {
    this.paginaActual = pagina;
    const primero = this.pacientesPagina[0];
    if (primero) this.seleccionarPaciente(primero);
  }

  @HostListener('window:resize')
  ajustarCantidadMostrar(): void {
    const cantidad = calcularFilasVisibles(this.panelTabla?.nativeElement ?? null);
    if (cantidad === this.cantidadMostrar) return;
    this.cantidadMostrar = cantidad;
    this.paginaActual = this.paginaDelPaciente(this.pacienteSeleccionado);
    this.cdr.detectChanges();
  }

  private paginaDelPaciente(paciente: PacienteResumido | null): number {
    if (!paciente) return 1;
    const indice = this.pacientesFiltrados.findIndex(
      (item) => item.pacienteId === paciente.pacienteId,
    );
    return indice >= 0 ? Math.floor(indice / this.cantidadMostrar) + 1 : 1;
  }

  // ------------------- DETALLE -------------------
  recargarDetalle(): void {
    if (this.pacienteSeleccionado) this.cargarDetalle(this.pacienteSeleccionado);
  }

  private cargarDetalle(paciente: PacienteResumido): void {
    this.cargandoDetalle = true;
    this.errorDetalle = '';

    this.servicioPaciente
      .obtenerPaciente(paciente.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.detalle = detalle;
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.cargandoDetalle = false;
          this.errorDetalle = this.mensajeError(
            error,
            'No se pudo cargar el detalle del paciente.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  protected esHospitalizacion(): boolean {
    const tipo = this.detalle?.tipoAtencion ?? this.pacienteSeleccionado?.tipoTratamiento ?? null;
    return tipo === 'HOSPITALIZACION';
  }

  protected tipoAtencionLegible(): string {
    const tipo = this.detalle?.tipoAtencion ?? this.pacienteSeleccionado?.tipoTratamiento ?? null;
    return tipo ? this.etiquetasTipo[tipo] : '—';
  }

  protected sexoLegible(sexo: Sexo | null): string {
    return sexo ? this.etiquetasSexo[sexo] : '—';
  }

  protected fechaHoraLegible(valor: string | null): string {
    if (!valor) return '—';
    const [fecha, hora = ''] = valor.split('T');
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return valor;
    return `${dia}-${mes}-${anio}${hora ? ` • ${hora.slice(0, 5)}` : ''}`;
  }

  protected responsableNombre(): string {
    const responsable = this.detalle?.responsable;
    if (!responsable) return 'No registrado';
    const nombre = `${responsable.nombres} ${responsable.apellidos}`.trim();
    return nombre || 'No registrado';
  }

  protected responsableTelefono(): string {
    return this.detalle?.responsable?.telefono?.trim() || 'No registrado';
  }

  // ------------------- DOCUMENTOS -------------------
  /** Documentos que pertenecen a una fila concreta (procedimiento, alta o referencia). */
  documentosDeFila(fila: FilaDocumentoVista): DocumentoEpisodio[] {
    return this.documentos.filter((documento) => {
      if (documento.tipo !== fila.tipo) return false;
      if (fila.tipo === 'AUTORIZACION_PROCEDIMIENTO') {
        return documento.procedimientoMedicoId === fila.procedimientoId;
      }
      if (fila.tipo === 'ALTA_MEDICA' || fila.tipo === 'RECETA') {
        return documento.altaId === fila.altaId;
      }
      return true;
    });
  }

  tieneDocumentosFila(fila: FilaDocumentoVista): boolean {
    return this.documentosDeFila(fila).length > 0;
  }

  autorizacionPendiente(fila: FilaDocumentoVista): boolean {
    if (fila.tipo !== 'AUTORIZACION_PROCEDIMIENTO' || fila.procedimientoId === null) return false;
    const procedimiento = this.procedimientosDocumento.find(
      (item) => item.id === fila.procedimientoId,
    );
    return Boolean(
      procedimiento &&
        procedimiento.requiereAutorizacion &&
        !procedimiento.autorizacionGenerada &&
        procedimiento.estado === 'PENDIENTE',
    );
  }

  recargarDocumentos(): void {
    this.cargarDocumentos(this.pacienteSeleccionado);
  }

  private cargarDocumentos(paciente: PacienteResumido | null): void {
    this.errorDocumentos = '';

    const episodioId = paciente?.episodioId ?? paciente?.ultimoEpisodioId ?? null;
    if (!paciente || episodioId === null) {
      this.documentos = [];
      this.cargandoDocumentos = false;
      return;
    }

    this.cargandoDocumentos = true;
    this.servicioDocumento
      .listarDocumentos(episodioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documentos) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.documentos = documentos;
          this.cargandoDocumentos = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.cargandoDocumentos = false;
          this.errorDocumentos = this.mensajeError(error, 'No se pudieron cargar los documentos.');
          this.cdr.detectChanges();
        },
      });
  }

  abrirModalDocumentos(fila: FilaDocumentoVista): void {
    const documentos = this.documentosDeFila(fila);
    if (!documentos.length) return;

    const archivos: ArchivoVisor[] = documentos.map((documento) => ({
      id: documento.id,
      nombreOriginal: documento.nombreOriginal,
    }));

    this.modalService.open(VisorArchivos, {
      title: fila.etiqueta,
      modalClass: 'modal-visor-documentos',
      archivos,
      indiceInicial: 0,
      cargarArchivo: (archivo: ArchivoVisor) =>
        this.servicioDocumento.obtenerArchivo(Number(archivo.id)),
      onEliminar: (archivo: ArchivoVisor) =>
        this.servicioDocumento.eliminarDocumento(Number(archivo.id)),
      onCambio: () => this.cargarDocumentos(this.pacienteSeleccionado),
    });
  }

  seleccionarArchivo(fila: FilaDocumentoVista, input: HTMLInputElement): void {
    if (this.episodioIdDocumentacion === null || this.subiendoTipo) return;
    this.filaSubida = fila;
    input.value = '';
    input.click();
  }

  subirDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fila = this.filaSubida;
    const episodioId = this.episodioIdDocumentacion;
    const usuarioId = this.authService.currentUser()?.id;
    this.filaSubida = null;

    if (!fila || episodioId === null) return;
    if (!usuarioId) {
      this.popUps.advertencia('No se pudo identificar al usuario para cargar el documento.');
      input.value = '';
      return;
    }

    const resultado = this.archivoService.procesar(event);
    if (resultado.mensaje) {
      this.popUps.advertencia(resultado.mensaje);
      input.value = '';
      return;
    }
    if (!resultado.seleccionado) {
      input.value = '';
      return;
    }

    this.subiendoTipo = fila.tipo;
    this.servicioDocumento
      .subirDocumento(
        episodioId,
        fila.tipo,
        usuarioId,
        resultado.seleccionado.archivo,
        fila.procedimientoId,
        fila.altaId,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.subiendoTipo = null;
          input.value = '';
          this.popUps.exito('Documento cargado correctamente.');
          this.cargarDocumentos(this.pacienteSeleccionado);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.subiendoTipo = null;
          input.value = '';
          this.popUps.error(this.mensajeError(error, 'No se pudo cargar el documento.'));
          this.cdr.detectChanges();
        },
      });
  }

  /** Abre la carta de autorización del procedimiento de la fila. */
  async generarAutorizacionFila(fila: FilaDocumentoVista): Promise<void> {
    const paciente = this.pacienteSeleccionado;
    const detalle = this.detalle;
    const episodioId = this.episodioIdDocumentacion;

    if (episodioId === null) {
      this.popUps.advertencia('El paciente no tiene un episodio para generar la autorización.');
      return;
    }
    if (!detalle || !paciente || fila.procedimientoId === null) {
      this.popUps.advertencia('No se pudo cargar la información del paciente.');
      return;
    }

    this.generandoAutorizacion = true;
    this.cdr.detectChanges();

    try {
      const procedimiento = this.procedimientosDocumento.find(
        (item) => item.id === fila.procedimientoId,
      );
      if (!procedimiento) {
        this.popUps.advertencia('No se encontró el procedimiento seleccionado.');
        return;
      }

      const datos = this.aDatosAutorizacion(detalle, [
        { id: procedimiento.id, nombre: procedimiento.tipoProcedimientoNombre },
      ]);
      const blob = await this.servicioPdfAutorizacion.generarBlob({
        paciente: datos.paciente,
        autoriza: datos.autoriza,
        medico: datos.medico,
        procedimiento: { nombre: procedimiento.tipoProcedimientoNombre },
        fechaGeneracion: new Date(),
      });

      if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;

      this.abrirPdfGenerado(
        blob,
        `autorizacion-${procedimiento.id}.pdf`,
        `Autorización: ${procedimiento.tipoProcedimientoNombre}`,
      );

      this.servicioProcedimientos
        .marcarAutorizacionGenerada(procedimiento.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.cargarProcedimientosDocumento(paciente),
          error: () => this.cargarProcedimientosDocumento(paciente),
        });
    } catch (error) {
      this.popUps.error(this.mensajeError(error, 'No se pudo generar la autorización.'));
    } finally {
      this.generandoAutorizacion = false;
      this.cdr.detectChanges();
    }
  }

  /** Genera el PDF del alta seleccionada y lo muestra en el visor, sin persistirlo. */
  async generarAltaDocumento(fila: FilaDocumentoVista): Promise<void> {
    const alta = fila.alta;
    if (!alta || this.generandoDocumentoId) return;

    await this.generarPdfDeAlta(fila, async (datosPaciente, medico) => {
      const blob = await this.servicioPdfAlta.generarBlob({
        paciente: datosPaciente,
        alta: {
          tipoAlta: alta.tipoAlta,
          diagnosticoEgreso: alta.diagnosticoEgreso,
          condicionEgresoNombre: alta.condicionEgresoNombre,
          observacionEgreso: alta.observacionEgreso,
          fechaHoraEgreso: alta.fechaHoraEgreso,
          motivoRetiro: alta.motivoRetiro,
          riesgosRetiro: alta.riesgosRetiro,
          institucionNombre: alta.institucionNombre,
          motivoReferencia: alta.motivoReferencia,
          indicacionesTraslado: alta.indicacionesTraslado,
          tratamientos: alta.tratamientos,
        },
        medico,
      });
      this.abrirPdfGenerado(blob, `alta-${alta.id}.pdf`, fila.etiqueta);
    });
  }

  /** Genera la receta médica del alta seleccionada y la muestra en el visor. */
  async generarRecetaDocumento(fila: FilaDocumentoVista): Promise<void> {
    const alta = fila.alta;
    if (!alta || this.generandoDocumentoId) return;

    if (!alta.tratamientos.length) {
      this.popUps.advertencia('El alta no tiene medicamentos ni cuidados para la receta.');
      return;
    }

    await this.generarPdfDeAlta(fila, async (datosPaciente, medico) => {
      const medicamentos = this.tratamientosDocumento(alta, 'MEDICAMENTO');
      const cuidados = this.tratamientosDocumento(alta, 'CUIDADO');
      const datos: DatosDocumentoTratamiento = {
        paciente: datosPaciente,
        medicamentos,
        cuidados,
        medico,
        titulo: 'RECETA MÉDICA',
      };
      const blob = await this.servicioPdf.generarBlob(datos);
      this.abrirPdfGenerado(blob, `receta-${alta.id}.pdf`, 'Receta médica');
    });
  }

  private async generarPdfDeAlta(
    fila: FilaDocumentoVista,
    generar: (
      paciente: {
        nombre: string;
        cui: string | null;
        sexo: string;
        edad: string;
        direccion: string;
      },
      medico: { nombre: string; especialidad: string },
    ) => Promise<void>,
  ): Promise<void> {
    const paciente = this.pacienteSeleccionado;
    if (!paciente) return;

    this.generandoDocumentoId = fila.clave;
    this.cdr.detectChanges();

    try {
      const detalle =
        this.detalle ??
        (await firstValueFrom(this.servicioPaciente.obtenerPaciente(paciente.pacienteId)));
      if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
      if (!this.detalle) this.detalle = detalle;

      const especialidad = await this.obtenerEspecialidadMedico(detalle.medicoId);
      if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
      await generar(this.datosPacienteDocumento(detalle, paciente), {
        nombre: detalle.medicoNombre?.trim() || 'No registrado',
        especialidad,
      });
    } catch (error) {
      this.popUps.error(this.mensajeError(error, 'No se pudo generar el documento.'));
    } finally {
      this.generandoDocumentoId = null;
      this.cdr.detectChanges();
    }
  }

  private abrirPdfGenerado(blob: Blob, nombre: string, titulo: string): void {
    this.modalService.open(VisorArchivos, {
      title: titulo,
      modalClass: 'modal-visor-documentos',
      archivos: [{ id: 0, nombreOriginal: nombre }],
      indiceInicial: 0,
      cargarArchivo: () => of(blob),
    });
  }

  private tratamientosDocumento(
    alta: AltaResponse,
    tipo: 'MEDICAMENTO' | 'CUIDADO',
  ): TratamientoDocumento[] {
    return alta.tratamientos
      .filter((tratamiento) => tratamiento.tipo === tipo)
      .map((tratamiento) => {
        const vista = this.aTratamientoAltaVista(tratamiento, 0);
        return {
          nombre: vista.nombre,
          cantidad: vista.cantidad,
          frecuencia: vista.frecuencia,
          duracion: vista.duracion,
          observaciones: vista.observaciones,
        };
      });
  }

  private cargarProcedimientosDocumento(paciente: PacienteResumido): void {
    const episodioId = paciente.episodioId ?? paciente.ultimoEpisodioId;
    if (episodioId === null) {
      this.procedimientosDocumento = [];
      this.cdr.detectChanges();
      return;
    }

    this.servicioProcedimientos
      .getProcedimientos(episodioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (procedimientos) => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.procedimientosDocumento = procedimientos;
          this.cdr.detectChanges();
        },
        error: () => {
          if (this.pacienteSeleccionado?.pacienteId !== paciente.pacienteId) return;
          this.procedimientosDocumento = [];
          this.cdr.detectChanges();
        },
      });
  }

  private etiquetaAlta(alta: AltaResponse): string {
    const tipo: Record<TipoAltaApi, string> = {
      INDICACION_MEDICA: 'Indicación médica',
      RETIRO_VOLUNTARIO: 'Retiro voluntario',
      REFERENCIA_TRASLADO: 'Referencia / traslado',
    };
    const fecha = alta.fechaHoraEgreso?.split('T')[0] ?? '';
    return fecha ? `${tipo[alta.tipoAlta]} · ${fecha}` : tipo[alta.tipoAlta];
  }

  private datosPacienteDocumento(detalle: PacienteDetalle, paciente: PacienteResumido) {
    return {
      nombre: detalle.nombreCompleto || paciente.nombreCompleto,
      cui: detalle.cui?.trim() || paciente.cui?.trim() || null,
      sexo: this.sexoLegible(detalle.sexo),
      edad: detalle.edad === null ? '—' : `${detalle.edad} años`,
      direccion: detalle.direccion?.trim() || '—',
    };
  }

  /** Resuelve quién autoriza: el familiar responsable si existe, o el propio paciente. */
  private aDatosAutorizacion(
    detalle: PacienteDetalle,
    procedimientos: ProcedimientoAutorizacionVista[],
  ): DatosAutorizacionVista {
    const responsable = detalle.responsable;
    const nombreResponsable = responsable
      ? `${responsable.nombres} ${responsable.apellidos}`.trim()
      : '';

    const autoriza = nombreResponsable
      ? {
          nombre: nombreResponsable,
          cui: responsable?.cui ?? null,
          calidad: 'representante legal del paciente',
        }
      : {
          nombre: detalle.nombreCompleto,
          cui: detalle.cui,
          calidad: 'paciente',
        };

    return {
      paciente: { nombre: detalle.nombreCompleto, cui: detalle.cui },
      autoriza,
      medico: { nombre: detalle.medicoNombre?.trim() || 'No registrado' },
      procedimientos,
    };
  }

  // ------------------- ACCIONES DE MODAL -------------------
  abrirModalAgregar(): void {
    this.modalService.open(ModalAgregarPaciente, {
      title: 'Agregar paciente',
      isEditing: false,
      onSuccess: () => this.listarPacientes(),
    });
  }

  abrirModalEditar(): void {
    if (!this.pacienteSeleccionado || !this.detalle) return;

    const pacienteId = this.pacienteSeleccionado.pacienteId;
    this.modalService.open(ModalAgregarPaciente, {
      title: 'Editar paciente',
      isEditing: true,
      pacienteId,
      datosEdicion: this.detalle,
      onSuccess: () => this.listarPacientes(pacienteId),
    });
  }

  // ------------------- AUXILIARES -------------------
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
