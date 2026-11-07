import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { BitacoraEntry } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import {
  accionLegible,
  claseAccion,
  descripcionBitacora,
  formatearFechaHora,
  resumenDetalle,
} from '../data/bitacora-format';

@Component({
  selector: 'app-bitacora-general',
  imports: [FormsModule, CampoValidado],
  templateUrl: './bitacora-general.html',
  styleUrl: '../reporte-comun.scss',
})
export class BitacoraGeneral implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  entradas: BitacoraEntry[] = [];

  ngOnInit(): void {
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
        this.entradas = [...d].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar la bitácora.');
        this.cdr.detectChanges();
      },
    });
  }

  total(): number {
    return this.entradas.length;
  }

  creados(): number {
    return this.entradas.filter((e) => e.accion === 'CREAR').length;
  }

  editados(): number {
    return this.entradas.filter((e) => e.accion === 'EDITAR').length;
  }

  eliminados(): number {
    return this.entradas.filter((e) => e.accion === 'ELIMINAR').length;
  }

  accionLegible(accion: string): string {
    return accionLegible(accion);
  }

  claseAccion(accion: string): string {
    return claseAccion(accion);
  }

  descripcion(entrada: BitacoraEntry): string {
    return descripcionBitacora(entrada);
  }

  detalle(entrada: BitacoraEntry): string {
    return resumenDetalle(entrada);
  }

  formatearFechaHora(iso: string): string {
    return formatearFechaHora(iso);
  }

  exportarPdf(): void {
    exportarPdf(
      'Bitácora general',
      ['Fecha', 'Usuario', 'Acción', 'Descripción', 'Detalle'],
      this.entradas.map(
        (e) =>
          [
            formatearFechaHora(e.fechaHora),
            e.usuarioNombre ?? '—',
            accionLegible(e.accion),
            descripcionBitacora(e),
            resumenDetalle(e),
          ] as Celda[],
      ),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Bitácora general',
      ['Fecha', 'Usuario', 'Acción', 'Descripción', 'Detalle'],
      this.entradas.map(
        (e) =>
          [
            formatearFechaHora(e.fechaHora),
            e.usuarioNombre ?? '—',
            accionLegible(e.accion),
            descripcionBitacora(e),
            resumenDetalle(e),
          ] as Celda[],
      ),
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
