import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Conteo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-medica',
  imports: [FormsModule, GraficaBarras],
  templateUrl: './reporte-medica.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteMedica implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;

  diagnosticos: Conteo[] = [];
  altas: Conteo[] = [];
  atenciones: Conteo[] = [];

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
      this.service.diagnosticosFrecuentes(this.desde, this.hasta).subscribe({
        next: (d) => (this.diagnosticos = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los diagnósticos.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.altasPorTipo(this.desde, this.hasta).subscribe({
        next: (d) => (this.altas = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las altas.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.atencionesPorMedico(this.desde, this.hasta).subscribe({
        next: (d) => (this.atenciones = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las atenciones.'),
        complete: fin,
      }),
    );
    this.sub = s;
  }

  etiquetasDiagnosticos(): string[] {
    return this.diagnosticos.slice(0, 10).map((d) => d.nombre);
  }

  valoresDiagnosticos(): number[] {
    return this.diagnosticos.slice(0, 10).map((d) => d.cantidad);
  }

  exportarPdf(): void {
    exportarPdf(
      'Médica - Diagnósticos frecuentes',
      ['Diagnóstico', 'Cantidad'],
      this.diagnosticos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Médica - Diagnósticos frecuentes',
      ['Diagnóstico', 'Cantidad'],
      this.diagnosticos.map((d) => [d.nombre, d.cantidad] as Celda[]),
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
