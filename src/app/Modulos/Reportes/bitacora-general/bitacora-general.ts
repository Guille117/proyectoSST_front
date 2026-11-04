import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { BitacoraEntry } from '../data/reportes-interfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-bitacora-general',
  imports: [FormsModule],
  templateUrl: './bitacora-general.html',
  styleUrl: '../reporte-comun.scss',
})
export class BitacoraGeneral implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  entradas: BitacoraEntry[] = [];

  constructor() {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.bitacoraGeneral(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.entradas = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar la bitácora.');
      },
    });
  }

  formatearFechaHora(iso: string): string {
    const fecha = new Date(iso);
    return isNaN(fecha.getTime()) ? iso : fecha.toLocaleString();
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
