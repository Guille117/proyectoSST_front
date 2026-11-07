import { ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of, Subject, switchMap } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { ProductoConteo } from '../data/reportes-interfaz';
import { Celda, crearExcel, crearPdf } from '../data/reportes-export';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { GraficaDona } from '../grafica-dona/grafica-dona';
import {
  ReporteVistaToggle,
  ReporteVista,
} from '../shared/reporte-vista-toggle/reporte-vista-toggle';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ModalService } from '../../../modal-principal/modal-service';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';

interface FilaReporte extends ProductoConteo {
  participacion: number;
}

interface ResumenTipo {
  tipo: ProductoConteo['tipo'];
  etiqueta: string;
  cantidad: number;
  participacion: number;
  color: string;
}

const TITULO = 'Medicamentos más vendidos';
const TOP_BARRAS = 10;

const COLORES_TIPO: Record<ProductoConteo['tipo'], string> = {
  MEDICAMENTO: '#2563eb',
  INSUMO: '#14b8a6',
};

@Component({
  selector: 'app-reporte-mas-vendidos',
  imports: [FormsModule, CampoValidado, GraficaBarras, GraficaDona, ReporteVistaToggle],
  templateUrl: './reporte-mas-vendidos.html',
  styleUrl: './reporte-mas-vendidos.scss',
})
export class ReporteMasVendidos {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly solicitudes = new Subject<void>();

  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  total = 0;
  readonly titulo = TITULO;
  readonly vistaPanel = signal<ReporteVista>('grafica');
  filas: FilaReporte[] = [];
  tipos: ResumenTipo[] = [];

  constructor() {
    // switchMap cancela la petición anterior si el usuario vuelve a generar el reporte.
    this.solicitudes
      .pipe(
        switchMap(() => {
          this.cargando = true;
          return this.service.productosMasVendidos(this.desde, this.hasta).pipe(
            catchError((error) => {
              this.popUps.errorDesdeBackend(error, 'No se pudo cargar el reporte.');
              return of(null);
            }),
            finalize(() => {
              this.cargando = false;
              this.cdr.detectChanges();
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((datos) => {
        // Ante un error se conservan las filas y los filtros ya cargados.
        if (datos) {
          this.aplicarDatos(datos);
        }
      });

    this.generar();
  }

  generar(): void {
    this.solicitudes.next();
  }

  cambiarVista(vista: ReporteVista): void {
    this.vistaPanel.set(vista);
  }

  principal(): FilaReporte | undefined {
    return this.filas[0];
  }

  etiquetasBarras(): string[] {
    return this.filas.slice(0, TOP_BARRAS).map((fila) => fila.nombre);
  }

  valoresBarras(): number[] {
    return this.filas.slice(0, TOP_BARRAS).map((fila) => fila.cantidad);
  }

  etiquetasTipos(): string[] {
    return this.tipos.map((resumen) => resumen.etiqueta);
  }

  valoresTipos(): number[] {
    return this.tipos.map((resumen) => resumen.cantidad);
  }

  coloresTipos(): string[] {
    return this.tipos.map((resumen) => resumen.color);
  }

  etiquetaTipo(tipo: ProductoConteo['tipo']): string {
    return tipo === 'INSUMO' ? 'Insumo' : 'Medicamento';
  }

  porcentaje(valor: number): string {
    return `${valor.toFixed(1)} %`;
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
  }

  mensajePrincipal(): string {
    const principal = this.filas[0];
    if (!principal) return '';
    const participacion = this.porcentaje(principal.participacion);
    return `${principal.nombre} fue el producto con mayor movimiento del período, con ${principal.cantidad} unidades (${participacion} del total).`;
  }

  exportarPdf(): void {
    if (!this.filas.length) return;
    const blob = crearPdf(TITULO, this.encabezados(), this.filasExportacion());
    this.abrirVisor(blob, `${TITULO}.pdf`, 'application/pdf');
  }

  exportarExcel(): void {
    if (!this.filas.length) return;
    const blob = crearExcel(TITULO, this.encabezados(), this.filasExportacion());
    const tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    this.abrirVisor(blob, `${TITULO}.xlsx`, tipo);
  }

  private aplicarDatos(datos: ProductoConteo[]): void {
    const ordenados = [...datos].sort((a, b) => b.cantidad - a.cantidad);
    this.total = ordenados.reduce((suma, fila) => suma + fila.cantidad, 0);

    this.filas = ordenados.map((fila) => ({
      ...fila,
      // El backend guarda el tipo en mayúsculas; se normaliza por seguridad.
      tipo: fila.tipo === 'INSUMO' ? 'INSUMO' : 'MEDICAMENTO',
      participacion: this.total ? (fila.cantidad / this.total) * 100 : 0,
    }));

    this.tipos = (['MEDICAMENTO', 'INSUMO'] as const).map((tipo) => {
      const cantidad = this.filas
        .filter((fila) => fila.tipo === tipo)
        .reduce((suma, fila) => suma + fila.cantidad, 0);
      return {
        tipo,
        etiqueta: this.etiquetaTipo(tipo),
        cantidad,
        participacion: this.total ? (cantidad / this.total) * 100 : 0,
        color: COLORES_TIPO[tipo],
      };
    });
  }

  private encabezados(): string[] {
    return ['Producto', 'Tipo', 'Cantidad', '% participación'];
  }

  private filasExportacion(): Celda[][] {
    const filas = this.filas.map((fila) => [
      fila.nombre,
      this.etiquetaTipo(fila.tipo),
      fila.cantidad,
      this.porcentaje(fila.participacion),
    ]);
    return [...filas, ['Total', '', this.total, '100.0 %']] as Celda[][];
  }

  private abrirVisor(blob: Blob, nombre: string, tipo: string): void {
    const archivo: ArchivoVisor = { id: nombre, nombreOriginal: nombre, tipo };
    this.modalService.open(VisorArchivos, {
      title: TITULO,
      modalClass: 'modal-visor-documentos',
      archivos: [archivo],
      indiceInicial: 0,
      cargarArchivo: () => of(blob),
    });
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private haceDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().slice(0, 10);
  }
}
