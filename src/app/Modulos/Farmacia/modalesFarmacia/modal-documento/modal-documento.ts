import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TimeoutError, finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ModalAction, ModalService } from '../../../../modal-principal/modal-service';
import { ServicioCompra } from '../../ingresos/agregar-compra/data/servicio-compra';

@Component({
  selector: 'app-modal-documento',
  templateUrl: './modal-documento.html',
  styleUrl: './modal-documento.scss',
})
export class ModalDocumento implements OnInit {
  @Input() documento = '';
  @Input() nombreArchivo = '';

  private readonly servicioCompra = inject(ServicioCompra);
  private readonly modalService = inject(ModalService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  cargando = signal(false);
  error = signal('');
  esImagen = signal(false);
  urlImagen = signal<SafeUrl | null>(null);
  urlDocumento = signal<SafeResourceUrl | null>(null);

  private urlArchivo = signal<string | null>(null);
  private extension = signal('');
  private objectUrl: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    });
  }

  get modalActions(): ModalAction[] {
    return [
      {
        id: 'imprimir',
        label: 'Imprimir',
        className: '_cancelar',
        icon: 'bi bi-printer',
        onClick: () => this.imprimir(),
      },
      {
        id: 'descargar',
        label: 'Descargar',
        className: '_principal',
        icon: 'bi bi-download',
        onClick: () => this.descargar(),
      },
      {
        id: 'cerrar',
        label: 'Cerrar',
        className: '_cancelar',
        onClick: () => this.modalService.close(),
      },
    ];
  }

  ngOnInit(): void {
    if (!this.documento.trim()) {
      this.error.set('No hay un documento para mostrar.');
      return;
    }

    const url = this.resolverUrl(this.documento);
    const esData = url.startsWith('data:') || url.startsWith('blob:');

    if (esData || !this.esUrlDelBackend(url)) {
      this.extension.set(
        esData
          ? this.extensionDesdeTipo(url.match(/^data:([^;,]+)/i)?.[1] ?? '')
          : this.extensionDesdeUrl(url),
      );
      this.urlArchivo.set(url);
      this.mostrarUrl(
        url,
        esData ? url.startsWith('data:image/') : this.esImagenPorExtension(url),
      );
      return;
    }

    this.cargando.set(true);
    this.servicioCompra
      .obtenerComprobante(url)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (blob) => {
          this.objectUrl = URL.createObjectURL(blob);
          this.extension.set(
            this.extensionDesdeTipo(blob.type) || this.extensionDesdeUrl(url),
          );
          this.urlArchivo.set(this.objectUrl);
          this.mostrarUrl(this.objectUrl, blob.type.startsWith('image/'));
        },
        error: (error) => {
          // Si falla la descarga autenticada, se intenta mostrar la URL directamente.
          this.extension.set(this.extensionDesdeUrl(url));
          this.urlArchivo.set(url);
          this.mostrarUrl(url, this.esImagenPorExtension(url));
          this.error.set(
            error instanceof TimeoutError
              ? 'El servidor no respondió dentro del tiempo esperado.'
              : '',
          );
        },
      });
  }

  descargar(): void {
    const url = this.urlArchivo();
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = this.nombreDescarga();
    enlace.rel = 'noopener';
    enlace.target = '_blank';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  imprimir(): void {
    const url = this.urlArchivo();
    if (!url) return;

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';

    frame.onload = () => {
      const ventana = frame.contentWindow;
      if (!ventana) {
        window.open(url, '_blank');
        frame.remove();
        return;
      }

      try {
        ventana.focus();
        ventana.print();
      } catch {
        window.open(url, '_blank');
      } finally {
        window.setTimeout(() => frame.remove(), 1000);
      }
    };

    frame.src = url;
    document.body.appendChild(frame);
  }

  private mostrarUrl(url: string, esImagen: boolean): void {
    this.esImagen.set(esImagen);
    if (esImagen) {
      this.urlImagen.set(this.sanitizer.bypassSecurityTrustUrl(url));
      this.urlDocumento.set(null);
      return;
    }

    this.urlDocumento.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.urlImagen.set(null);
  }

  private nombreDescarga(): string {
    const base = this.nombreArchivo.trim() || 'documento';
    if (/\.[a-z0-9]{2,5}$/i.test(base)) return base;

    const extension = this.extension();
    return extension ? `${base}.${extension}` : base;
  }

  private resolverUrl(valor: string): string {
    const url = valor.trim();
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/')) return `${new URL(environment.apiUrl).origin}${url}`;
    return `${environment.apiUrl}/${url.replace(/^\/+/, '')}`;
  }

  /** Evita enviar el token a URLs externas: solo se descargan las del backend o del mismo origen. */
  private esUrlDelBackend(url: string): boolean {
    try {
      const destino = new URL(url);
      return (
        destino.origin === window.location.origin ||
        destino.origin === new URL(environment.apiUrl).origin
      );
    } catch {
      return false;
    }
  }

  private esImagenPorExtension(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg)(?:[?#].*)?$/i.test(url);
  }

  private extensionDesdeUrl(url: string): string {
    return url.match(/\.([a-z0-9]{2,5})(?:[?#].*)?$/i)?.[1]?.toLowerCase() ?? '';
  }

  private extensionDesdeTipo(tipo: string): string {
    switch (tipo.toLowerCase()) {
      case 'application/pdf':
        return 'pdf';
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      case 'image/svg+xml':
        return 'svg';
      default:
        return '';
    }
  }
}
