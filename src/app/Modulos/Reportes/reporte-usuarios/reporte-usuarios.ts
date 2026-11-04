import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Conteo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-usuarios',
  imports: [FormsModule, GraficaBarras],
  templateUrl: './reporte-usuarios.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteUsuarios implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;

  porRol: Conteo[] = [];
  accesos: Conteo[] = [];

  constructor() {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    let pendientes = 2;
    const fin = () => {
      pendientes--;
      if (pendientes <= 0) this.cargando = false;
    };
    const s = new Subscription();
    s.add(
      this.service.usuariosPorRol().subscribe({
        next: (d) => (this.porRol = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los usuarios.'),
        complete: fin,
      }),
    );
    s.add(
      this.service.accesos(this.desde, this.hasta).subscribe({
        next: (d) => (this.accesos = d),
        error: (e) => this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los accesos.'),
        complete: fin,
      }),
    );
    this.sub = s;
  }

  etiquetasAccesos(): string[] {
    return this.accesos.slice(0, 10).map((d) => d.nombre);
  }

  valoresAccesos(): number[] {
    return this.accesos.slice(0, 10).map((d) => d.cantidad);
  }

  exportarPdf(): void {
    exportarPdf(
      'Usuarios - Accesos',
      ['Usuario', 'Accesos'],
      this.accesos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Usuarios - Accesos',
      ['Usuario', 'Accesos'],
      this.accesos.map((d) => [d.nombre, d.cantidad] as Celda[]),
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
