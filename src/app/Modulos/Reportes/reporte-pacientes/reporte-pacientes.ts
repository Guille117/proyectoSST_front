import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Censo, Conteo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-pacientes',
  imports: [FormsModule, GraficaBarras],
  templateUrl: './reporte-pacientes.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReportePacientes implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;

  censo: Censo[] = [];
  ingresos: Conteo[] = [];
  demografia: Conteo[] = [];

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
      this.service.censo().subscribe({
        next: (d) => (this.censo = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudo cargar el censo.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.ingresosPorArea(this.desde, this.hasta).subscribe({
        next: (d) => (this.ingresos = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los ingresos.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.demografia().subscribe({
        next: (d) => (this.demografia = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudo cargar la demografía.'),
        complete: fin,
      }),
    );
    this.sub = s;
  }

  etiquetasIngresos(): string[] {
    return this.ingresos.map((d) => d.nombre);
  }

  valoresIngresos(): number[] {
    return this.ingresos.map((d) => d.cantidad);
  }

  exportarPdf(): void {
    exportarPdf(
      'Pacientes - Ingresos por área',
      ['Área', 'Ingresos'],
      this.ingresos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Pacientes - Ingresos por área',
      ['Área', 'Ingresos'],
      this.ingresos.map((d) => [d.nombre, d.cantidad] as Celda[]),
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
