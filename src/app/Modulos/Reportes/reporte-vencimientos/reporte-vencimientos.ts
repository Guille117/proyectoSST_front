import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Vencimiento } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-reporte-vencimientos',
  imports: [],
  templateUrl: './reporte-vencimientos.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteVencimientos implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  cargando = false;
  datos: Vencimiento[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.vencimientos().subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el reporte de vencimientos.');
      },
    });
  }

  nombreMes(mes: number): string {
    return MESES[mes - 1] ?? `${mes}`;
  }

  exportarPdf(): void {
    exportarPdf(
      'Vencimientos por mes/año',
      ['Producto', 'Cantidad vencida', 'Mes', 'Año'],
      this.datos.map((d) => [d.producto, d.cantidad, this.nombreMes(d.mes), d.anio] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Vencimientos por mes/año',
      ['Producto', 'Cantidad vencida', 'Mes', 'Año'],
      this.datos.map((d) => [d.producto, d.cantidad, this.nombreMes(d.mes), d.anio] as Celda[]),
    );
  }
}
