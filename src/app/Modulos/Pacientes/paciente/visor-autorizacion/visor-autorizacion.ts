import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ProcedimientoMedicoService } from '../../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import { DocumentoAutorizacionPdfService } from '../data/documento-autorizacion-pdf-service';

/** Procedimiento pendiente que requiere autorización y que puede incluirse en la carta. */
export interface ProcedimientoAutorizacionVista {
  id: number;
  nombre: string;
}

/** Datos ya resueltos para generar la carta de autorización. */
export interface DatosAutorizacionVista {
  paciente: { nombre: string; cui: string | null };
  autoriza: { nombre: string; cui: string | null; calidad: string };
  medico: { nombre: string };
  procedimientos: ProcedimientoAutorizacionVista[];
}

/**
 * Visor de la carta de autorización: elige el procedimiento (si hay varios), genera el PDF y lo
 * muestra en un iframe con opción de imprimir.
 */
@Component({
  selector: 'app-visor-autorizacion',
  imports: [FormsModule],
  templateUrl: './visor-autorizacion.html',
  styleUrl: './visor-autorizacion.scss',
})
export class VisorAutorizacion implements OnInit, OnDestroy {
  @Input() datos!: DatosAutorizacionVista;
  @Input() onCambio?: () => void;

  private readonly modalService = inject(ModalService);
  private readonly servicioPdf = inject(DocumentoAutorizacionPdfService);
  private readonly servicioProcedimientos = inject(ProcedimientoMedicoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  procedimientoSeleccionadoId: number | null = null;
  cargando = signal(false);
  listo = signal(false);
  error = signal('');
  urlPdf = signal<SafeResourceUrl | null>(null);

  private blob: Blob | null = null;
  private objectUrl: string | null = null;
  private solicitud = 0;

  get hayMultiples(): boolean {
    return this.datos.procedimientos.length > 1;
  }

  ngOnInit(): void {
    this.document.documentElement.classList.add('visor-abierto');

    if (!this.datos.procedimientos.length) {
      this.error.set('No hay procedimientos pendientes que requieran autorización.');
      return;
    }

    this.procedimientoSeleccionadoId = this.datos.procedimientos[0].id;
    this.generar();
  }

  ngOnDestroy(): void {
    this.document.documentElement.classList.remove('visor-abierto');
    this.revocarUrl();
  }

  cambiarProcedimiento(id: number): void {
    this.procedimientoSeleccionadoId = id;
    this.generar();
  }

  private generar(): void {
    const id = this.procedimientoSeleccionadoId;
    const procedimiento = this.datos.procedimientos.find((item) => item.id === id);
    if (!procedimiento) return;

    this.revocarUrl();
    this.blob = null;
    this.urlPdf.set(null);
    this.listo.set(false);
    this.error.set('');
    this.cargando.set(true);

    const version = ++this.solicitud;

    this.servicioPdf
      .generarBlob({
        paciente: this.datos.paciente,
        autoriza: this.datos.autoriza,
        medico: this.datos.medico,
        procedimiento: { nombre: procedimiento.nombre },
        fechaGeneracion: new Date(),
      })
      .then((blob) => {
        if (version !== this.solicitud) return;

        this.blob = blob;
        this.objectUrl = URL.createObjectURL(blob);
        this.urlPdf.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(`${this.objectUrl}#view=Fit&navpanes=0`),
        );
        this.listo.set(true);
        this.cargando.set(false);

        this.marcarGenerada(procedimiento.id);
      })
      .catch(() => {
        if (version !== this.solicitud) return;

        this.cargando.set(false);
        this.error.set('No se pudo generar la carta de autorización.');
      });
  }

  /** Marca el procedimiento como con carta ya generada para que el icono deje de pulsar. */
  private marcarGenerada(procedimientoId: number): void {
    this.servicioProcedimientos
      .marcarAutorizacionGenerada(procedimientoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onCambio?.(),
        error: () => this.onCambio?.(),
      });
  }

  /** Imprime el PDF mediante un iframe temporal, sin descargarlo automáticamente. */
  imprimir(): void {
    if (!this.blob) return;

    const url = URL.createObjectURL(this.blob);
    const marco = this.document.createElement('iframe');
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
    this.document.body.appendChild(marco);
  }

  cerrar(): void {
    this.document.documentElement.classList.remove('visor-abierto');
    this.modalService.close();
  }

  private revocarUrl(): void {
    if (!this.objectUrl) return;

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
