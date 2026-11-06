import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { GlucosaPromedio } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';

@Component({
  selector: 'app-reporte-glucosa',
  imports: [FormsModule, CampoValidado],
  templateUrl: './reporte-glucosa.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteGlucosa implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: GlucosaPromedio[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.glucosaPromedio(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar la glucosa.');
      },
    });
  }

  exportarPdf(): void {
    exportarPdf(
      'Glucosa promedio por tipo',
      ['Tipo', 'Promedio'],
      this.datos.map((d) => [d.tipo, d.promedio] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Glucosa promedio por tipo',
      ['Tipo', 'Promedio'],
      this.datos.map((d) => [d.tipo, d.promedio] as Celda[]),
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
