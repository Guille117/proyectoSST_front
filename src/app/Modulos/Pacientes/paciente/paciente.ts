import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { calcularFilasVisibles, FILAS_VISIBLES_POR_DEFECTO } from '../../../shared/paginacion/filas-visibles';
import { ModalService } from '../../../modal-principal/modal-service';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { Sexo } from '../../Usuarios/usu/data/usuarioInterfaz';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';
import { DocumentoEpisodioService } from './data/documento-episodio-service';
import { DocumentoEpisodio, TipoDocumentoEpisodio } from './data/documentoInterfaz';
import { PacienteDetalle, PacienteResumido, TipoAtencion } from './data/pacienteInterfaz';
import { PacienteService } from './data/paciente-service';

/** Tipo de documento que se muestra en el panel del paciente. */
interface TipoDocumentoVista {
  tipo: TipoDocumentoEpisodio;
  etiqueta: string;
}

@Component({
  selector: 'app-paciente',
  imports: [TabSwitch, Paginacion],
  templateUrl: './paciente.html',
  styleUrl: './paciente.scss',
})
export class Paciente implements OnInit {
  private readonly modalService = inject(ModalService);
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioDocumento = inject(DocumentoEpisodioService);
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

  detalle: PacienteDetalle | null = null;
  cargandoDetalle = false;
  errorDetalle = '';

  documentos: DocumentoEpisodio[] = [];
  cargandoDocumentos = false;
  errorDocumentos = '';
  subiendoTipo: TipoDocumentoEpisodio | null = null;

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
          const seleccionado =
            pacientes.find((paciente) => paciente.pacienteId === pacienteIdSeleccionado) ??
            pacientes[0] ??
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
      return;
    }
    if (!forzar && this.pacienteSeleccionado?.pacienteId === paciente.pacienteId) return;

    this.pacienteSeleccionado = paciente;
    this.detalle = null;
    this.documentos = [];
    this.cargarDetalle(paciente);
    this.cargarDocumentos(paciente);
  }

  esSeleccionado(paciente: PacienteResumido): boolean {
    return this.pacienteSeleccionado?.pacienteId === paciente.pacienteId;
  }

  get pacientesPagina(): PacienteResumido[] {
    const inicio = (this.paginaActual - 1) * this.cantidadMostrar;
    return this.pacientes.slice(inicio, inicio + this.cantidadMostrar);
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
    const indice = this.pacientes.findIndex((item) => item.pacienteId === paciente.pacienteId);
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
