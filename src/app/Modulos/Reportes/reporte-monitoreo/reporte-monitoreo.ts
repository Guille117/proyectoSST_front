import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { MonitoreoSummary } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';

@Component({
  selector: 'app-reporte-monitoreo',
  imports: [FormsModule, CampoValidado],
  templateUrl: './reporte-monitoreo.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteMonitoreo implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: MonitoreoSummary = { signosVitales: 0, glucosa: 0, controlHidrico: 0 };

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.monitoreo(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el monitoreo.');
      },
    });
  }

  exportarPdf(): void {
    exportarPdf('Monitoreo', ['Indicador', 'Cantidad'], this.filas());
  }

  exportarExcel(): void {
    exportarExcel('Monitoreo', ['Indicador', 'Cantidad'], this.filas());
  }

  private filas(): Celda[][] {
    return [
      ['Signos vitales', this.datos.signosVitales],
      ['Mediciones de glucosa', this.datos.glucosa],
      ['Control hídrico', this.datos.controlHidrico],
    ];
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
