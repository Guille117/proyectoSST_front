import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { CompraProveedor, Conteo, StockBajo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-farmacia',
  imports: [FormsModule, GraficaBarras],
  templateUrl: './reporte-farmacia.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteFarmacia implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;

  despachos: Conteo[] = [];
  compras: CompraProveedor[] = [];
  stock: StockBajo[] = [];

  constructor() {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    let pendientes = 3;
    const fin = () => {
      pendientes--;
      if (pendientes <= 0) this.cargando = false;
    };
    const s = new Subscription();
    s.add(
      this.service.despachos(this.desde, this.hasta).subscribe({
        next: (d) => (this.despachos = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los despachos.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.comprasPorProveedor(this.desde, this.hasta).subscribe({
        next: (d) => (this.compras = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las compras.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.stockBajo(5).subscribe({
        next: (d) => (this.stock = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudo cargar el stock bajo.'),
        complete: fin,
      }),
    );
    this.sub = s;
  }

  etiquetasDespachos(): string[] {
    return this.despachos.slice(0, 10).map((d) => d.nombre);
  }

  valoresDespachos(): number[] {
    return this.despachos.slice(0, 10).map((d) => d.cantidad);
  }

  exportarPdf(): void {
    exportarPdf(
      'Farmacia - Despachos',
      ['Producto', 'Cantidad'],
      this.despachos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Farmacia - Despachos',
      ['Producto', 'Cantidad'],
      this.despachos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
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
