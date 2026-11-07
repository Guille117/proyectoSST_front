import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Censo } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';

@Component({
  selector: 'app-reporte-censo',
  imports: [GraficaBarras, ReporteVistaToggle],
  templateUrl: './reporte-censo.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteCenso implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  cargando = false;
  datos: Censo[] = [];
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
    this.sub = this.service.censo().subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el censo.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  total(): number {
    return this.datos.reduce((suma, d) => suma + d.cantidad, 0);
  }

  areas(): number {
    return new Set(this.datos.map((d) => d.area)).size;
  }

  ocupadas(): number {
    return this.datos
      .filter((d) => d.estado === 'OCUPADA')
      .reduce((suma, d) => suma + d.cantidad, 0);
  }

  disponibles(): number {
    return this.datos
      .filter((d) => d.estado === 'DISPONIBLE')
      .reduce((suma, d) => suma + d.cantidad, 0);
  }

  etiquetas(): string[] {
    return this.resumenArea().map((r) => r.area);
  }

  valores(): number[] {
    return this.resumenArea().map((r) => r.cantidad);
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
  }

  exportarPdf(): void {
    exportarPdf(
      'Censo de camas por área',
      ['Área', 'Estado', 'Cantidad'],
      this.datos.map((d) => [d.area, d.estado, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Censo de camas por área',
      ['Área', 'Estado', 'Cantidad'],
      this.datos.map((d) => [d.area, d.estado, d.cantidad] as Celda[]),
    );
  }

  private resumenArea(): Array<{ area: string; cantidad: number }> {
    const areas = new Map<string, number>();
    for (const fila of this.datos) {
      areas.set(fila.area, (areas.get(fila.area) ?? 0) + fila.cantidad);
    }
    return [...areas.entries()]
      .map(([area, cantidad]) => ({ area, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }
}
