import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TimeoutError } from 'rxjs';
import { ModalAction, ModalService } from '../../../../modal-principal/modal-service';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { DocumentoEpisodioService } from '../data/documento-episodio-service';
import { DocumentoEpisodio } from '../data/documentoInterfaz';

/**
 * Visor de los documentos de un tipo del episodio. Recorre los archivos con flechas y permite
 * eliminarlos con confirmación desde el pie del modal.
 */
@Component({
  selector: 'app-modal-documentos-paciente',
  templateUrl: './modal-documentos-paciente.html',
  styleUrl: './modal-documentos-paciente.scss',
})
export class ModalDocumentosPaciente implements OnInit {
  @Input() documentos: DocumentoEpisodio[] = [];
  @Input() onCambio?: () => void;

  private readonly servicioDocumento = inject(DocumentoEpisodioService);
  private readonly modalService = inject(ModalService);
  private readonly modalPopUps = inject(ModalPopUps);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  indice = signal(0);
  cargando = signal(false);
  error = signal('');
  eliminando = signal(false);
  esImagen = signal(false);
  urlImagen = signal<SafeUrl | null>(null);
  urlDocumento = signal<SafeResourceUrl | null>(null);

  private objectUrl: string | null = null;
  private solicitud = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.liberarUrl());
  }

  get documentoActual(): DocumentoEpisodio | null {
    return this.documentos[this.indice()] ?? null;
  }

  get puedeAnterior(): boolean {
    return this.indice() > 0;
  }

  get puedeSiguiente(): boolean {
    return this.indice() < this.documentos.length - 1;
  }

  get modalActions(): ModalAction[] {
    return [
      {
        id: 'eliminar',
        label: 'Eliminar',
        className: '_eliminar',
        icon: 'bi bi-trash3',
        onClick: () => this.eliminar(),
        disabled: () => this.eliminando() || this.cargando() || !this.documentoActual,
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
    this.cargarActual();
  }

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

  cargarActual(): void {
    const documento = this.documentoActual;
    this.liberarUrl();
    this.error.set('');
    this.esImagen.set(false);
    this.urlImagen.set(null);
    this.urlDocumento.set(null);

    if (!documento) return;

    this.cargando.set(true);
    const version = ++this.solicitud;

    this.servicioDocumento
      .obtenerArchivo(documento.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          if (version !== this.solicitud) return;
          this.objectUrl = URL.createObjectURL(blob);
          this.esImagen.set(blob.type.toLowerCase().startsWith('image/'));

          if (this.esImagen()) {
            this.urlImagen.set(this.sanitizer.bypassSecurityTrustUrl(this.objectUrl));
          } else {
            this.urlDocumento.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          }
          this.cargando.set(false);
        },
        error: (error) => {
          if (version !== this.solicitud) return;
          this.cargando.set(false);
          this.error.set(this.mensajeError(error, 'No se pudo mostrar el documento.'));
        },
      });
  }

  async eliminar(): Promise<void> {
    const documento = this.documentoActual;
    if (!documento || this.eliminando()) return;

    const confirmado = await this.modalPopUps.confirmarToast(
      `¿Eliminar el documento "${documento.nombreOriginal}"?`,
    );
    if (!confirmado) return;

    this.eliminando.set(true);
    this.servicioDocumento
      .eliminarDocumento(documento.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando.set(false);
          this.documentos = this.documentos.filter((item) => item.id !== documento.id);
          this.onCambio?.();
          void this.modalPopUps.exito('Documento eliminado correctamente.');

          if (!this.documentos.length) {
            this.modalService.close();
            return;
          }

          if (this.indice() >= this.documentos.length) {
            this.indice.set(this.documentos.length - 1);
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
          this.modalPopUps.errorDesdeBackend(error, 'No se pudo eliminar el documento.');
        },
      });
  }

  private liberarUrl(): void {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
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
