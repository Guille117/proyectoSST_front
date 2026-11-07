import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Vencimiento } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-reporte-vencimientos',
  imports: [GraficaBarras, ReporteVistaToggle],
  templateUrl: './reporte-vencimientos.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteVencimientos implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  cargando = false;
  datos: Vencimiento[] = [];
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
    this.sub = this.service.vencimientos().subscribe({
      next: (d) => {
        this.datos = [...d].sort(
          (a, b) => a.anio - b.anio || a.mes - b.mes || b.cantidad - a.cantidad,
        );
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el reporte de vencimientos.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  nombreMes(mes: number): string {
    return MESES[mes - 1] ?? `${mes}`;
  }

  total(): number {
    return this.datos.reduce((suma, d) => suma + d.cantidad, 0);
  }

  productos(): number {
    return new Set(this.datos.map((d) => d.producto)).size;
  }

  periodos(): number {
    return this.resumen().length;
  }

  principalPeriodo(): string {
    const principal = this.resumen().reduce(
      (mayor, actual) => (actual.cantidad > mayor.cantidad ? actual : mayor),
      { etiqueta: '', cantidad: -1 },
    );
    return principal.etiqueta;
  }

  etiquetas(): string[] {
    return this.resumen().map((p) => p.etiqueta);
  }

  valores(): number[] {
    return this.resumen().map((p) => p.cantidad);
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
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

  private resumen(): Array<{ etiqueta: string; cantidad: number }> {
    const periodos = new Map<string, { anio: number; mes: number; cantidad: number }>();
    for (const fila of this.datos) {
      const clave = `${fila.anio}-${fila.mes}`;
      const actual = periodos.get(clave);
      if (actual) {
        actual.cantidad += fila.cantidad;
      } else {
        periodos.set(clave, { anio: fila.anio, mes: fila.mes, cantidad: fila.cantidad });
      }
    }
    return [...periodos.values()]
      .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
      .map((p) => ({ etiqueta: `${this.nombreMes(p.mes)} ${p.anio}`, cantidad: p.cantidad }));
  }
}
