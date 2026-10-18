import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TimeoutError } from 'rxjs';
import { ModalService } from '../../modal-principal/modal-service';
import { ModalPopUps } from '../popUps/modal-popUpsService';
import {
  ArchivoVisor,
  CargarArchivoVisor,
  EliminarArchivoVisor,
} from './visor-archivos.interfaz';

type TipoVisor = 'pdf' | 'imagen' | 'texto' | 'word' | 'otro';
type ModoAjuste = 'manual' | 'pagina';

/**
 * Visor de archivos reutilizable: ocupa toda la pantalla, muestra PDF, imágenes y texto, y ofrece
 * zoom, impresión, descarga y apertura en otra pestaña. La carga del contenido la aporta el módulo
 * que lo abre para reutilizar sus servicios autenticados.
 */
@Component({
  selector: 'app-visor-archivos',
  templateUrl: './visor-archivos.html',
  styleUrl: './visor-archivos.scss',
})
export class VisorArchivos implements OnInit, OnDestroy {
  @Input() archivos: ArchivoVisor[] = [];
  @Input() indiceInicial = 0;
  @Input() cargarArchivo!: CargarArchivoVisor;
  @Input() onEliminar?: EliminarArchivoVisor;
  @Input() onCambio?: () => void;

  private readonly modalService = inject(ModalService);
  private readonly modalPopUps = inject(ModalPopUps);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  @ViewChild('contenido') private contenido?: ElementRef<HTMLElement>;

  indice = signal(0);
  cargando = signal(false);
  cargado = signal(false);
  eliminando = signal(false);
  error = signal('');
  tipo = signal<TipoVisor>('otro');
  mime = signal('');
  urlIframe = signal<SafeResourceUrl | null>(null);
  urlImagen = signal<SafeUrl | null>(null);
  zoom = signal(1);
  modoAjuste = signal<ModoAjuste>('pagina');
  dimensiones = signal<{ ancho: number; alto: number } | null>(null);

  private blob: Blob | null = null;
  private objectUrl: string | null = null;
  private solicitud = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.revocarUrl());
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  get archivoActual(): ArchivoVisor | null {
    return this.archivos[this.indice()] ?? null;
  }

  get puedeAnterior(): boolean {
    return this.indice() > 0;
  }

  get puedeSiguiente(): boolean {
    return this.indice() < this.archivos.length - 1;
  }

  get esPdf(): boolean {
    return this.tipo() === 'pdf';
  }

  get esImagen(): boolean {
    return this.tipo() === 'imagen';
  }

  get esTexto(): boolean {
    return this.tipo() === 'texto';
  }

  get puedeAbrir(): boolean {
    return this.cargado() && (this.esPdf || this.esImagen || this.esTexto);
  }

  get puedeImprimir(): boolean {
    return this.cargado() && (this.esPdf || this.esImagen || this.esTexto);
  }

  get etiquetaFormato(): string {
    switch (this.tipo()) {
      case 'pdf':
        return 'PDF';
      case 'imagen':
        return 'Imagen';
      case 'texto':
        return 'Texto';
      case 'word':
        return 'Word';
      default:
        return this.extensionDe(this.archivoActual?.nombreOriginal ?? '').toUpperCase() || 'Archivo';
    }
  }

  get iconoFormato(): string {
    switch (this.tipo()) {
      case 'pdf':
        return 'bi-file-earmark-pdf';
      case 'imagen':
        return 'bi-file-earmark-image';
      case 'texto':
        return 'bi-file-earmark-text';
      case 'word':
        return 'bi-file-earmark-word';
      default:
        return 'bi-file-earmark';
    }
  }

  get porcentajeZoom(): number {
    return Math.round(this.zoom() * 100);
  }

  get puedeAcercar(): boolean {
    return this.esImagen && this.zoom() < 4;
  }

  get puedeAlejar(): boolean {
    return this.esImagen && this.zoom() > 0.1;
  }

  get anchoImagen(): number | null {
    const dimensiones = this.dimensiones();
    return dimensiones ? Math.round(dimensiones.ancho * this.zoom()) : null;
  }

  get nombreDescarga(): string {
    const nombre = this.archivoActual?.nombreOriginal?.trim() || 'documento';
    if (/\.[a-z0-9]{1,8}$/i.test(nombre)) return nombre;

    const extension = this.extensionDesdeTipo(this.mime()) || this.extensionDe(nombre);
    return extension ? `${nombre}.${extension}` : nombre;
  }

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.document.documentElement.classList.add('visor-abierto');
    this.indice.set(this.limitarIndice(this.indiceInicial));
    this.cargarActual();
  }

  ngOnDestroy(): void {
    this.document.documentElement.classList.remove('visor-abierto');
  }

  // ------------------- CARGA DEL ARCHIVO -------------------
  /** Carga el archivo actual con la función que aporta el módulo de origen. */
  cargarActual(): void {
    const archivo = this.archivoActual;
    this.revocarUrl();
    this.blob = null;
    this.cargado.set(false);
    this.error.set('');
    this.tipo.set('otro');
    this.mime.set('');
    this.urlIframe.set(null);
    this.urlImagen.set(null);
    this.zoom.set(1);
    this.modoAjuste.set('pagina');
    this.dimensiones.set(null);

    if (!archivo) {
      this.error.set('No hay un archivo para mostrar.');
      return;
    }

    if (!this.cargarArchivo) {
      this.error.set('No se configuró la carga del archivo.');
      return;
    }

    this.cargando.set(true);
    const version = ++this.solicitud;

    this.cargarArchivo(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          if (version !== this.solicitud) return;

          this.blob = blob;
          this.objectUrl = URL.createObjectURL(blob);
          this.definirTipo(blob, archivo);

          if (this.esPdf || this.esTexto) {
            const urlPdf = this.esPdf
              ? `${this.objectUrl}#view=Fit&navpanes=0`
              : this.objectUrl;
            this.urlIframe.set(this.sanitizer.bypassSecurityTrustResourceUrl(urlPdf));
          } else if (this.esImagen) {
            this.urlImagen.set(this.sanitizer.bypassSecurityTrustUrl(this.objectUrl));
          }

          this.cargado.set(true);
          this.cargando.set(false);
        },
        error: (error) => {
          if (version !== this.solicitud) return;

          this.cargando.set(false);
          this.error.set(this.mensajeError(error, 'No se pudo abrir el archivo.'));
        },
      });
  }

  private definirTipo(blob: Blob, archivo: ArchivoVisor): void {
    const mime = (blob.type || archivo.tipo || '').toLowerCase();
    const extension = this.extensionDe(archivo.nombreOriginal);
    this.mime.set(mime);

    if (mime.includes('pdf') || extension === 'pdf') {
      this.tipo.set('pdf');
      return;
    }

    if (
      mime.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(extension)
    ) {
      this.tipo.set('imagen');
      return;
    }

    if (mime.startsWith('text/') || extension === 'txt') {
      this.tipo.set('texto');
      return;
    }

    if (mime.includes('word') || ['doc', 'docx'].includes(extension)) {
      this.tipo.set('word');
      return;
    }

    this.tipo.set('otro');
  }

  // ------------------- ZOOM DE IMÁGENES -------------------
  /** Ajusta la imagen a su tamaño natural después de que el navegador la carga. */
  onImagenCargada(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    if (!imagen?.naturalWidth || !imagen?.naturalHeight) return;

    const teniaDimensiones = this.dimensiones() !== null;
    this.dimensiones.set({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });

    if (!teniaDimensiones || this.modoAjuste() === 'pagina') {
      this.ajustarPagina();
    }
  }

  ajustarPagina(): void {
    const escala = this.escalaPagina();
    if (escala === null) return;
    this.zoom.set(escala);
    this.modoAjuste.set('pagina');
  }

  /** Vuelve al tamaño real de la imagen, sin ajuste automático. */
  tamanoOriginal(): void {
    this.zoom.set(1);
    this.modoAjuste.set('manual');
  }

  acercar(): void {
    if (!this.esImagen) return;
    this.zoom.set(this.limitar(this.zoom() + 0.1));
    this.modoAjuste.set('manual');
  }

  alejar(): void {
    if (!this.esImagen) return;
    this.zoom.set(this.limitar(this.zoom() - 0.1));
    this.modoAjuste.set('manual');
  }

  @HostListener('window:resize')
  alRedimensionar(): void {
    if (this.modoAjuste() === 'pagina') {
      this.ajustarPagina();
    }
  }

  // ------------------- NAVEGACIÓN -------------------
  anterior(): void {
    if (!this.puedeAnterior) return;
    this.indice.update((indice) => indice - 1);
    this.cargarActual();
  }

  siguiente(): void {
    if (!this.puedeSiguiente) return;
    this.indice.update((indice) => indice + 1);
    this.cargarActual();
  }

  // ------------------- ACCIONES -------------------
  /** Descarga el archivo original con su nombre y extensión. */
  descargar(): void {
    if (!this.blob || !this.archivoActual) return;

    const url = URL.createObjectURL(this.blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = this.nombreDescarga;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Imprime solo el archivo mediante un iframe temporal. */
  imprimir(): void {
    if (!this.blob || !this.puedeImprimir) return;

    const url = URL.createObjectURL(this.blob);
    const marco = document.createElement('iframe');
    let impreso = false;

    marco.style.position = 'fixed';
    marco.style.right = '0';
    marco.style.bottom = '0';
    marco.style.width = '0';
    marco.style.height = '0';
    marco.style.border = '0';
    marco.src = url;

    const imprimirMarco = (): void => {
      if (impreso) return;
      impreso = true;

      try {
        marco.contentWindow?.focus();
        marco.contentWindow?.print();
      } catch {
        window.open(url, '_blank', 'noopener');
      }

      setTimeout(() => {
        marco.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    };

    marco.onload = imprimirMarco;
    setTimeout(imprimirMarco, 1500);
    document.body.appendChild(marco);
  }

  /** Abre una copia temporal del archivo en otra pestaña del navegador. */
  abrir(): void {
    if (!this.blob || !this.puedeAbrir) return;

    const url = URL.createObjectURL(this.blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /** Elimina el archivo actual si el módulo de origen habilitó la acción. */
  async eliminar(): Promise<void> {
    const archivo = this.archivoActual;
    if (!archivo || !this.onEliminar || this.eliminando()) return;

    const confirmado = await this.modalPopUps
      .confirmarToast(`¿Eliminar el archivo "${archivo.nombreOriginal}"?`)
      .catch(() => false);

    if (!confirmado) return;

    this.eliminando.set(true);
    this.onEliminar(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando.set(false);
          this.archivos = this.archivos.filter((item) => item !== archivo);
          this.onCambio?.();
          void this.modalPopUps.exito('Archivo eliminado correctamente.');

          if (!this.archivos.length) {
            this.cerrar();
            return;
          }

          if (this.indice() >= this.archivos.length) {
            this.indice.set(this.archivos.length - 1);
          }
          this.cargarActual();
        },
        error: (error) => {
          this.eliminando.set(false);
          if (error instanceof TimeoutError) {
            this.modalPopUps.error(
              'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
            );
            return;
          }
          this.modalPopUps.errorDesdeBackend(error, 'No se pudo eliminar el archivo.');
        },
      });
  }

  cerrar(): void {
    this.document.documentElement.classList.remove('visor-abierto');
    this.modalService.close();
  }

  // ------------------- APOYO -------------------
  private escalaPagina(): number | null {
    const dimensiones = this.dimensiones();
    const contenedor = this.contenido?.nativeElement;
    if (!dimensiones || !contenedor) return null;

    const escalaAncho = (contenedor.clientWidth - 48) / dimensiones.ancho;
    const escalaAlto = (contenedor.clientHeight - 48) / dimensiones.alto;
    return this.limitar(Math.min(escalaAncho, escalaAlto));
  }

  private limitar(escala: number): number {
    return Math.min(4, Math.max(0.1, escala));
  }

  private limitarIndice(indice: number): number {
    if (!this.archivos.length) return 0;
    return Math.min(Math.max(indice, 0), this.archivos.length - 1);
  }

  private extensionDe(nombre: string): string {
    return nombre.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() ?? '';
  }

  private extensionDesdeTipo(tipo: string): string {
    if (tipo.includes('pdf')) return 'pdf';
    if (tipo.includes('jpeg')) return 'jpg';
    if (tipo.includes('png')) return 'png';
    if (tipo.includes('webp')) return 'webp';
    if (tipo.includes('gif')) return 'gif';
    if (tipo.includes('text/plain')) return 'txt';
    if (tipo.includes('word')) return 'docx';
    return '';
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

  private revocarUrl(): void {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
