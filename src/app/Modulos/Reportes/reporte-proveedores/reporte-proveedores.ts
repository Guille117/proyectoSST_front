import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { CompraProveedor } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';

@Component({
  selector: 'app-reporte-proveedores',
  imports: [FormsModule, CampoValidado],
  templateUrl: './reporte-proveedores.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteProveedores implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: CompraProveedor[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.comprasPorProveedor(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las compras.');
      },
    });
  }

  exportarPdf(): void {
    exportarPdf(
      'Compras por proveedor',
      ['Proveedor', 'Compras', 'Total'],
      this.datos.map((d) => [d.proveedor, d.cantidad, d.total] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Compras por proveedor',
      ['Proveedor', 'Compras', 'Total'],
      this.datos.map((d) => [d.proveedor, d.cantidad, d.total] as Celda[]),
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
