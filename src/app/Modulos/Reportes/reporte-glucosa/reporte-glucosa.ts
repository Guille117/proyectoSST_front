import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { GlucosaPromedio } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';

@Component({
  selector: 'app-reporte-glucosa',
  imports: [FormsModule, CampoValidado, GraficaBarras, ReporteVistaToggle],
  templateUrl: './reporte-glucosa.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteGlucosa implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: GlucosaPromedio[] = [];
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
    this.sub = this.service.glucosaPromedio(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = [...d].sort((a, b) => b.promedio - a.promedio);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar la glucosa.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  promedioGeneral(): number {
    if (!this.datos.length) return 0;
    return this.datos.reduce((suma, d) => suma + d.promedio, 0) / this.datos.length;
  }

  mayor(): GlucosaPromedio | undefined {
    return this.datos[0];
  }

  menor(): GlucosaPromedio | undefined {
    return this.datos[this.datos.length - 1];
  }

  etiquetas(): string[] {
    return this.datos.map((d) => d.tipo);
  }

  valores(): number[] {
    return this.datos.map((d) => d.promedio);
  }

  promedio(valor: number): string {
    return valor.toFixed(1);
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
