import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { StockBajo } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';

@Component({
  selector: 'app-reporte-stock',
  imports: [GraficaBarras, ReporteVistaToggle],
  templateUrl: './reporte-stock.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteStock implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  cargando = false;
  datos: StockBajo[] = [];
  readonly vista = signal<ReporteVista>('grafica');

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.stockBajo(5).subscribe({
      next: (d) => {
        this.datos = [...d].sort((a, b) => a.disponible - b.disponible);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el stock bajo.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  totalUnidades(): number {
    return this.datos.reduce((suma, d) => suma + d.disponible, 0);
  }

  menor(): StockBajo | undefined {
    return this.datos[0];
  }

  proximoVencimiento(): string {
    const fechas = this.datos
      .map((d) => d.vencimiento)
      .filter((f): f is string => !!f)
      .sort();
    return fechas[0] ?? '—';
  }

  etiquetas(): string[] {
    return this.datos.slice(0, 10).map((d) => d.producto);
  }

  valores(): number[] {
    return this.datos.slice(0, 10).map((d) => d.disponible);
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
  }

  exportarPdf(): void {
    exportarPdf(
      'Stock bajo',
      ['Producto', 'Disponible', 'Vencimiento'],
      this.datos.map((d) => [d.producto, d.disponible, d.vencimiento ?? '—'] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Stock bajo',
      ['Producto', 'Disponible', 'Vencimiento'],
      this.datos.map((d) => [d.producto, d.disponible, d.vencimiento ?? '—'] as Celda[]),
    );
  }
}
