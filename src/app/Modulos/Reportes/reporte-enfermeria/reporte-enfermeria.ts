import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Conteo, GlucosaPromedio, MonitoreoSummary } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-enfermeria',
  imports: [FormsModule, GraficaBarras],
  templateUrl: './reporte-enfermeria.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteEnfermeria implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;

  monitoreo: MonitoreoSummary = { signosVitales: 0, glucosa: 0, controlHidrico: 0 };
  glucosa: GlucosaPromedio[] = [];
  medicamentos: Conteo[] = [];
  cuidados: Conteo[] = [];

  constructor() {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    let pendientes = 4;
    const fin = () => {
      pendientes--;
      if (pendientes <= 0) this.cargando = false;
    };
    const s = new Subscription();
    s.add(
      this.service.monitoreo(this.desde, this.hasta).subscribe({
        next: (d) => (this.monitoreo = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudo cargar el monitoreo.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.glucosaPromedio(this.desde, this.hasta).subscribe({
        next: (d) => (this.glucosa = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudo cargar la glucosa.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.tratamientosMedicamentos(this.desde, this.hasta).subscribe({
        next: (d) => (this.medicamentos = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los medicamentos.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.tratamientosCuidados(this.desde, this.hasta).subscribe({
        next: (d) => (this.cuidados = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los cuidados.'),
        complete: fin,
      }),
    );
    this.sub = s;
  }

  etiquetasMedicamentos(): string[] {
    return this.medicamentos.slice(0, 10).map((d) => d.nombre);
  }

  valoresMedicamentos(): number[] {
    return this.medicamentos.slice(0, 10).map((d) => d.cantidad);
  }

  exportarPdf(): void {
    exportarPdf(
      'Enfermería - Tratamientos',
      ['Tratamiento', 'Cantidad'],
      this.medicamentos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Enfermería - Tratamientos',
      ['Tratamiento', 'Cantidad'],
      this.medicamentos.map((d) => [d.nombre, d.cantidad] as Celda[]),
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
