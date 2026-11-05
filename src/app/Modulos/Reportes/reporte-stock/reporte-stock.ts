import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { StockBajo } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-stock',
  imports: [],
  templateUrl: './reporte-stock.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteStock implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  cargando = false;
  datos: StockBajo[] = [];

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
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el stock bajo.');
      },
    });
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
