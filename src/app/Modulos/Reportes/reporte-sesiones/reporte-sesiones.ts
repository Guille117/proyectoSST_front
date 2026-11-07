import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { SesionActiva } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { formatearFechaHora } from '../data/bitacora-format';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-sesiones',
  imports: [],
  templateUrl: './reporte-sesiones.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteSesiones implements OnInit {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  cargando = false;
  datos: SesionActiva[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.sesionesActivas().subscribe({
      next: (d) => {
        this.datos = [...d].sort((a, b) =>
          (b.ultimaActividad ?? '').localeCompare(a.ultimaActividad ?? ''),
        );
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las sesiones.');
        this.cdr.detectChanges();
      },
    });
  }

  usuarios(): number {
    return new Set(this.datos.map((d) => d.usuario)).size;
  }

  sinCierre(): number {
    return this.datos.filter((d) => !d.ultimoLogout).length;
  }

  ultimaActividad(): string {
    return this.formatear(this.datos[0]?.ultimaActividad ?? null);
  }

  formatear(valor: string | null): string {
    return valor ? formatearFechaHora(valor) : '—';
  }

  exportarPdf(): void {
    exportarPdf(
      'Sesiones activas',
      ['Usuario', 'Último inicio', 'Último cierre', 'Última actividad'],
      this.filasExportacion(),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Sesiones activas',
      ['Usuario', 'Último inicio', 'Último cierre', 'Última actividad'],
      this.filasExportacion(),
    );
  }

  private filasExportacion(): Celda[][] {
    return this.datos.map(
      (d) =>
        [
          d.usuario,
          this.formatear(d.ultimoLogin),
          this.formatear(d.ultimoLogout),
          this.formatear(d.ultimaActividad),
        ] as Celda[],
    );
  }
}
