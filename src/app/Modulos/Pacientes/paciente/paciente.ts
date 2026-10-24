import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { calcularFilasVisibles, FILAS_VISIBLES_POR_DEFECTO } from '../../../shared/paginacion/filas-visibles';
import { ModalService } from '../../../modal-principal/modal-service';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { AltaService } from '../../Medica/alta/data/alta-service';
import { AltaTratamientoResponse } from '../../Medica/alta/data/altaInterfaz';
import { Sexo } from '../../Usuarios/usu/data/usuarioInterfaz';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';
import { ConsumoEpisodioService } from './data/consumo-service';
import { ConsumoEpisodio } from './data/consumoInterfaz';
import { DocumentoEpisodioService } from './data/documento-episodio-service';
import { DocumentoTratamientoPdfService } from './data/documento-tratamiento-pdf-service';
import { DocumentoEpisodio, TipoDocumentoEpisodio } from './data/documentoInterfaz';
import { PacienteDetalle, PacienteResumido, TipoAtencion } from './data/pacienteInterfaz';
import { PacienteService } from './data/paciente-service';
import { UsuarioService } from '../../Usuarios/usu/data/usuario-service';
import { EpisodioResumen } from '../expediente/data/expedienteInterfaz';
import { ResumenEpisodio } from '../expediente/resumen-episodio/resumen-episodio';

/** Tipo de documento que se muestra en el panel del paciente. */
interface TipoDocumentoVista {
  tipo: TipoDocumentoEpisodio;
  etiqueta: string;
}

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
  private readonly servicioAlta = inject(AltaService);
  private readonly servicioUsuario = inject(UsuarioService);
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

  /** La vista de documentación ocupa la pantalla en lugar del listado y el detalle. */
  documentacionAbierta = false;

  /** Sección de documentación elegida. */
  seccionDocumentacion: SeccionDocumentacion = 'tratamiento';

  /** Medicamentos del alta del episodio consultado. */
  medicamentosAlta: TratamientoAltaVista[] = [];

  /** Cuidados del alta del episodio consultado. */
  cuidadosAlta: TratamientoAltaVista[] = [];

  cargandoTratamientos = false;
  errorTratamientos = '';
  generandoDocumento = false;

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

  private tipoSubida: TipoDocumentoEpisodio | null = null;

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

  /**
   * Tipos de documento visibles. RESPONSABILIDAD se mantiene en los tipos y en el servicio, pero no
   * se muestra todavía porque el flujo actual solo maneja autorización y referencia.
   */
  protected readonly tiposDocumento: TipoDocumentoVista[] = [
    { tipo: 'AUTORIZACION_PROCEDIMIENTO', etiqueta: 'Autorización de atención' },
    { tipo: 'REFERENCIA', etiqueta: 'Hoja de referencia' },
  ];

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
    this.cargarDetalle(paciente);
    this.cargarDocumentos(paciente);
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

  /** El paciente no tiene un episodio activo porque ya fue dado de alta. */
  get estaEnAlta(): boolean {
    return this.pacienteSeleccionado?.episodioId === null;
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
  documentosPorTipo(tipo: TipoDocumentoEpisodio): DocumentoEpisodio[] {
    return this.documentos.filter((documento) => documento.tipo === tipo);
  }

  recargarDocumentos(): void {
    this.cargarDocumentos(this.pacienteSeleccionado);
  }

  private cargarDocumentos(paciente: PacienteResumido | null): void {
    this.errorDocumentos = '';

    if (!paciente?.episodioId) {
      this.documentos = [];
      this.cargandoDocumentos = false;
      return;
    }

    this.cargandoDocumentos = true;
    this.servicioDocumento
      .listarDocumentos(paciente.episodioId)
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

  abrirModalDocumentos(tipo: TipoDocumentoEpisodio, etiqueta: string): void {
    const documentos = this.documentosPorTipo(tipo);
    if (!documentos.length) return;

    const archivos: ArchivoVisor[] = documentos.map((documento) => ({
      id: documento.id,
      nombreOriginal: documento.nombreOriginal,
    }));

    this.modalService.open(VisorArchivos, {
      title: etiqueta,
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

  seleccionarArchivo(tipo: TipoDocumentoEpisodio, input: HTMLInputElement): void {
    if (!this.pacienteSeleccionado?.episodioId || this.subiendoTipo) return;
    this.tipoSubida = tipo;
    input.value = '';
    input.click();
  }

  subirDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tipo = this.tipoSubida;
    const episodioId = this.pacienteSeleccionado?.episodioId;
    const usuarioId = this.authService.currentUser()?.id;
    this.tipoSubida = null;

    if (!tipo || !episodioId) return;
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

    this.subiendoTipo = tipo;
    this.servicioDocumento
      .subirDocumento(episodioId, tipo, usuarioId, resultado.seleccionado.archivo)
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
