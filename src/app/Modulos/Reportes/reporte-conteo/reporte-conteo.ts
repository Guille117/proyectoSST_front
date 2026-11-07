import { ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { ClaveConteo, Conteo } from '../data/reportes-interfaz';
import { GraficaBarras } from '../grafica-barras/grafica-barras';
import { GraficaDona } from '../grafica-dona/grafica-dona';
import { ReporteVistaToggle, ReporteVista } from '../shared/reporte-vista-toggle/reporte-vista-toggle';
import { Celda, crearExcel, crearPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { ModalService } from '../../../modal-principal/modal-service';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';

export interface ConfigConteo {
  clave: ClaveConteo;
  titulo: string;
  etiquetaColumna: string;
  etiquetaValor: string;
  conGrafica: boolean;
  graficaTitulo?: string;
  tipoGrafica?: 'barras' | 'dona';
  formatearEtiquetas?: boolean;
  tipoValor?: 'conteo' | 'promedio' | 'porcentaje';
}

const PALETA = [
  '#2563eb',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#0ea5e9',
  '#ef4444',
  '#64748b',
];

@Component({
  selector: 'app-reporte-conteo',
  imports: [FormsModule, GraficaBarras, GraficaDona, ReporteVistaToggle, CampoValidado],
  templateUrl: './reporte-conteo.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteConteo {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  config: ConfigConteo | null = null;
  desde = this.haceDias(30);
  hasta = this.hoy();
  cargando = false;
  datos: Conteo[] = [];
  readonly vista = signal<ReporteVista>('grafica');

  constructor() {
    // El mismo componente se reutiliza entre rutas de conteo; recargar al cambiar de reporte.
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.config = (data['reporte'] as ConfigConteo | undefined) ?? null;
      this.datos = [];
      this.vista.set('grafica');
      this.generar();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    if (!this.config) return;
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.conteo(this.config.clave, this.desde, this.hasta).subscribe({
      next: (d) => {
        this.datos = [...d].sort((a, b) => b.cantidad - a.cantidad);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el reporte.');
        this.cdr.detectChanges();
      },
    });
  }

  cambiarVista(vista: ReporteVista): void {
    this.vista.set(vista);
  }

  total(): number {
    return this.datos.reduce((suma, d) => suma + d.cantidad, 0);
  }

  principal(): Conteo | undefined {
    return this.datos[0];
  }

  principalEtiqueta(): string {
    return this.principal() ? this.etiqueta(this.principal()!.nombre) : '—';
  }

  participacionPrincipal(): number {
    return this.principal() ? this.participacion(this.principal()!.cantidad) : 0;
  }

  participacion(cantidad: number): number {
    const total = this.total();
    return total ? (cantidad / total) * 100 : 0;
  }

  tipoGrafica(): 'barras' | 'dona' {
    return this.config?.tipoGrafica ?? 'barras';
  }

  tipoValor(): 'conteo' | 'promedio' | 'porcentaje' {
    return this.config?.tipoValor ?? 'conteo';
  }

  promedioValores(): number {
    return this.datos.length ? this.total() / this.datos.length : 0;
  }

  formatoValor(valor: number): string {
    if (this.tipoValor() === 'porcentaje') return `${valor.toFixed(1)} %`;
    if (this.tipoValor() === 'promedio') return valor.toFixed(1);
    return this.numero(valor);
  }

  menorEtiqueta(): string {
    const menor = this.datos[this.datos.length - 1];
    return menor ? this.etiqueta(menor.nombre) : '—';
  }

  etiquetas(): string[] {
    const limite = this.tipoGrafica() === 'dona' ? this.datos.length : 10;
    return this.datos.slice(0, limite).map((d) => this.etiqueta(d.nombre));
  }

  etiqueta(nombre: string): string {
    if (!this.config?.formatearEtiquetas) return nombre;
    return nombre
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
  }

  valores(): number[] {
    const limite = this.tipoGrafica() === 'dona' ? this.datos.length : 10;
    return this.datos.slice(0, limite).map((d) => d.cantidad);
  }

  colores(): string[] {
    return this.datos.map((_, indice) => PALETA[indice % PALETA.length]);
  }

  numero(valor: number): string {
    return valor.toLocaleString('es-GT');
  }

  porcentaje(valor: number): string {
    return `${valor.toFixed(1)} %`;
  }

  exportarPdf(): void {
    if (!this.config || !this.datos.length) return;
    const blob = crearPdf(
      this.config.titulo,
      [this.config.etiquetaColumna, this.config.etiquetaValor],
      this.datos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
    this.abrirVisor(blob, `${this.config.titulo}.pdf`, 'application/pdf');
  }

  exportarExcel(): void {
    if (!this.config || !this.datos.length) return;
    const blob = crearExcel(
      this.config.titulo,
      [this.config.etiquetaColumna, this.config.etiquetaValor],
      this.datos.map((d) => [d.nombre, d.cantidad] as Celda[]),
    );
    this.abrirVisor(
      blob,
      `${this.config.titulo}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  private abrirVisor(blob: Blob, nombre: string, tipo: string): void {
    const archivo: ArchivoVisor = { id: nombre, nombreOriginal: nombre, tipo };
    this.modalService.open(VisorArchivos, {
      title: this.config?.titulo ?? 'Reporte',
      modalClass: 'modal-visor-documentos',
      archivos: [archivo],
      indiceInicial: 0,
      cargarArchivo: () => of(blob),
    });
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
