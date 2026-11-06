import { Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { ClaveConteo, Conteo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, crearExcel, crearPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { ModalService } from '../../../modal-principal/modal-service';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';

export interface ConfigConteo {
  clave: ClaveConteo;
  titulo: string;
  etiquetaColumna: string;
  etiquetaValor: string;
  conGrafica: boolean;
  graficaTitulo?: string;
}

@Component({
  selector: 'app-reporte-conteo',
  imports: [FormsModule, GraficaBarras, CampoValidado],
  templateUrl: './reporte-conteo.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteConteo implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private sub?: Subscription;

  config!: ConfigConteo;
  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: Conteo[] = [];

  constructor() {
    // El mismo componente se reutiliza entre rutas de conteo; recargar al cambiar de reporte.
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.config = data['reporte'] as ConfigConteo;
      this.datos = [];
      this.generar();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.conteo(this.config.clave, this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el reporte.');
      },
    });
  }

  etiquetas(): string[] {
    return this.datos.slice(0, 10).map((d) => d.nombre);
  }

  valores(): number[] {
    return this.datos.slice(0, 10).map((d) => d.cantidad);
  }

  exportarPdf(): void {
    const blob = crearPdf(
      this.config.titulo,
      [this.config.etiquetaColumna, this.config.etiquetaValor],
      this.datos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
    this.abrirVisor(blob, `${this.config.titulo}.pdf`, 'application/pdf');
  }

  exportarExcel(): void {
    const blob = crearExcel(
      this.config.titulo,
      [this.config.etiquetaColumna, this.config.etiquetaValor],
      this.datos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
    this.abrirVisor(
      blob,
      `${this.config.titulo}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  private abrirVisor(blob: Blob, nombre: string, tipo: string): void {
    const archivo: ArchivoVisor = { id: nombre, nombreOriginal: nombre, tipo };
    this.modalService.open(VisorArchivos, {
      title: this.config.titulo,
      modalClass: 'modal-visor-documentos',
      archivos: [archivo],
      indiceInicial: 0,
      cargarArchivo: () => of(blob),
    });
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private haceDias(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
}
