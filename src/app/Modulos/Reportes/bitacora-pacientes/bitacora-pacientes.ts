import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { BitacoraEntry } from '../data/reportes-interfaz';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteResumido } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

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
  private sub?: Subscription;
  private subBusqueda?: Subscription;

  desde = this.haceDias(30);
  hasta = this.hoy();
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
      },
      error: (e) => {
        this.buscando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron buscar pacientes.');
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
    this.sub = this.service
      .bitacoraPaciente(this.pacienteSeleccionado.pacienteId, this.desde, this.hasta)
      .subscribe({
        next: (d) => {
          this.entradas = d;
          this.cargando = false;
        },
        error: (e) => {
          this.cargando = false;
          this.popUps.errorDesdeBackend(e, 'No se pudo cargar la bitácora del paciente.');
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
