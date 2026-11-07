import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { CompraProveedor } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';

@Component({
  selector: 'app-reporte-proveedores',
  imports: [FormsModule, CampoValidado, GraficaBarras, ReporteVistaToggle],
  templateUrl: './reporte-proveedores.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteProveedores implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: CompraProveedor[] = [];
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
    this.sub = this.service.comprasPorProveedor(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = [...d].sort((a, b) => b.cantidad - a.cantidad);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron cargar las compras.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  totalCompras(): number {
    return this.datos.reduce((suma, d) => suma + d.cantidad, 0);
  }

  totalGastado(): number {
    return this.datos.reduce((suma, d) => suma + d.total, 0);
  }

  principal(): CompraProveedor | undefined {
    return this.datos[0];
  }

  etiquetas(): string[] {
    return this.datos.slice(0, 10).map((d) => d.proveedor);
  }

  valores(): number[] {
    return this.datos.slice(0, 10).map((d) => d.cantidad);
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
  }

  moneda(valor: number): string {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor);
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
