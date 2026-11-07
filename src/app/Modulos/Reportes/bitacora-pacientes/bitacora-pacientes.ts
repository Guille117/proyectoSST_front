import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { BitacoraEntry } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteResumido } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import {
  accionLegible,
  claseAccion,
  descripcionBitacora,
  formatearFechaHora,
  resumenDetalle,
} from '../data/bitacora-format';

@Component({
  selector: 'app-bitacora-pacientes',
  imports: [FormsModule],
  templateUrl: './bitacora-pacientes.html',
  styleUrl: '../reporte-comun.scss',
})
export class BitacoraPacientes implements OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly pacienteService = inject(PacienteService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private subBusqueda?: Subscription;

  cargando = false;
  entradas: BitacoraEntry[] = [];

  textoBusqueda = '';
  buscando = false;
  resultados: PacienteResumido[] = [];
  pacienteSeleccionado: PacienteResumido | null = null;

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subBusqueda?.unsubscribe();
  }

  buscarPacientes(): void {
    const texto = this.textoBusqueda.trim();
    if (!texto) return;
    this.subBusqueda?.unsubscribe();
    this.buscando = true;
    this.subBusqueda = this.pacienteService.buscarPacientes(texto).subscribe({
      next: (d) => {
        this.resultados = d;
        this.buscando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.buscando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron buscar pacientes.');
        this.cdr.detectChanges();
      },
    });
  }

  seleccionarPaciente(paciente: PacienteResumido): void {
    this.pacienteSeleccionado = paciente;
    this.resultados = [];
    this.textoBusqueda = paciente.nombreCompleto;
    this.generar();
  }

  generar(): void {
    if (!this.pacienteSeleccionado) return;
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.bitacoraPaciente(this.pacienteSeleccionado.pacienteId).subscribe({
      next: (d) => {
        this.entradas = [...d].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar la bitácora del paciente.');
        this.cdr.detectChanges();
      },
    });
  }

  total(): number {
    return this.entradas.length;
  }

  usuarios(): number {
    return new Set(this.entradas.map((e) => e.usuarioNombre).filter(Boolean)).size;
  }

  primerRegistro(): string {
    return this.resumenRegistro(this.entradas[0]);
  }

  ultimoRegistro(): string {
    return this.resumenRegistro(this.entradas[this.entradas.length - 1]);
  }

  detalle(entrada: BitacoraEntry): string {
    return resumenDetalle(entrada);
  }

  exportarPdf(): void {
    exportarPdf(
      'Bitácora de pacientes',
      ['Fecha', 'Usuario', 'Acción', 'Descripción', 'Detalle'],
      this.filasExportacion(),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Bitácora de pacientes',
      ['Fecha', 'Usuario', 'Acción', 'Descripción', 'Detalle'],
      this.filasExportacion(),
    );
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

  formatearFechaHora(iso: string): string {
    return formatearFechaHora(iso);
  }

  private filasExportacion(): Celda[][] {
    return this.entradas.map(
      (e) =>
        [
          formatearFechaHora(e.fechaHora),
          e.usuarioNombre ?? '—',
          accionLegible(e.accion),
          descripcionBitacora(e),
          resumenDetalle(e),
        ] as Celda[],
    );
  }

  private resumenRegistro(entrada: BitacoraEntry | undefined): string {
    if (!entrada) return '—';
    return `${entrada.usuarioNombre ?? '—'} · ${accionLegible(entrada.accion)}`;
  }
}
