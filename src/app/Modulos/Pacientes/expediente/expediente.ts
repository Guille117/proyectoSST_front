import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TimeoutError, forkJoin } from 'rxjs';
import { PacienteDetalle, TipoAtencion } from '../paciente/data/pacienteInterfaz';
import { PacienteService } from '../paciente/data/paciente-service';
import { EpisodioResumen, SeccionExpediente } from './data/expedienteInterfaz';
import { ExpedienteService } from './data/expediente-service';
import { ResumenEpisodio } from './resumen-episodio/resumen-episodio';

interface OpcionExpedienteVista {
  id: SeccionExpediente;
  titulo: string;
  icono: string;
}

interface SeccionExpedienteVista {
  titulo: string | null;
  opciones: OpcionExpedienteVista[];
}

@Component({
  selector: 'app-expediente',
  imports: [ResumenEpisodio],
  templateUrl: './expediente.html',
  styleUrl: './expediente.scss',
})
export class Expediente implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioExpediente = inject(ExpedienteService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  paciente: PacienteDetalle | null = null;
  episodioSeleccionado: EpisodioResumen | null = null;
  cargando = false;
  error = '';

  /** Opción del submenú actualmente seleccionada. */
  opcionActiva: SeccionExpediente = 'resumen';

  /** Opciones del submenú izquierdo agrupadas por sección. */
  readonly seccionesMenu: SeccionExpedienteVista[] = [
    {
      titulo: null,
      opciones: [
        { id: 'resumen', titulo: 'Resumen', icono: 'bi-journal-text' },
        { id: 'evaluacion', titulo: 'Evaluación clínica', icono: 'bi-clipboard2-pulse' },
        { id: 'examenes', titulo: 'Exámenes', icono: 'bi-clipboard2-check' },
        { id: 'procedimientos', titulo: 'Procedimientos', icono: 'bi-scissors' },
        { id: 'evolucion', titulo: 'Evolución médica', icono: 'bi-graph-up-arrow' },
        { id: 'indicaciones', titulo: 'Indicaciones médicas', icono: 'bi-capsule' },
        { id: 'alta', titulo: 'Alta médica', icono: 'bi-box-arrow-up-right' },
      ],
    },
    {
      titulo: 'Enfermería',
      opciones: [
        {
          id: 'registros-enfermeria',
          titulo: 'Registros de enfermería',
          icono: 'bi-clipboard2-pulse',
        },
      ],
    },
    {
      titulo: null,
      opciones: [
        { id: 'consumo', titulo: 'Consumo y estancia', icono: 'bi-receipt' },
      ],
    },
  ];

  ngOnInit(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
      this.error = 'No se pudo identificar al paciente del expediente.';
      return;
    }
    this.cargar(pacienteId);
  }

  seleccionarOpcion(opcion: SeccionExpediente): void {
    this.opcionActiva = opcion;
    this.cdr.markForCheck();
  }

  opcionActivaActual(): OpcionExpedienteVista | null {
    for (const seccion of this.seccionesMenu) {
      const opcion = seccion.opciones.find((item) => item.id === this.opcionActiva);
      if (opcion) return opcion;
    }
    return null;
  }

  volver(): void {
    this.location.back();
  }

  recargar(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (Number.isInteger(pacienteId) && pacienteId > 0) {
      this.cargar(pacienteId);
    }
  }

  tipoAtencionLegible(tipo: TipoAtencion): string {
    return tipo === 'HOSPITALIZACION' ? 'Hospitalización' : 'Emergencia';
  }

  sexoLegible(sexo: string | null | undefined): string {
    if (sexo === 'FEMENINO') return 'Femenino';
    if (sexo === 'MASCULINO') return 'Masculino';
    return '—';
  }

  fecha(valor: string | null): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return `${this.dosDigitos(fecha.getDate())}-${this.dosDigitos(
      fecha.getMonth() + 1,
    )}-${fecha.getFullYear()}`;
  }

  private dosDigitos(valor: number): string {
    return `${valor}`.padStart(2, '0');
  }

  private cargar(pacienteId: number): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      paciente: this.servicioPaciente.obtenerPaciente(pacienteId),
      episodios: this.servicioExpediente.listarEpisodios(pacienteId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, episodios }) => {
          this.paciente = paciente;
          this.episodioSeleccionado = this.episodioMasReciente(episodios);
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.cargando = false;
          this.error = this.mensajeError(error, 'No se pudo cargar el expediente.');
          this.cdr.detectChanges();
        },
      });
  }

  private episodioMasReciente(episodios: EpisodioResumen[]): EpisodioResumen | null {
    if (!episodios.length) return null;
    return [...episodios].sort((a, b) => {
      const fechaA = new Date(a.fechaHoraIngreso).getTime();
      const fechaB = new Date(b.fechaHoraIngreso).getTime();
      const valorA = Number.isNaN(fechaA) ? 0 : fechaA;
      const valorB = Number.isNaN(fechaB) ? 0 : fechaB;
      return valorB - valorA;
    })[0];
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    if (error instanceof TimeoutError) {
      return 'Error de comunicación. El servidor no respondió dentro del tiempo esperado.';
    }

    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error;
      if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
        const mensaje = String((cuerpo as { message?: unknown }).message ?? '').trim();
        if (mensaje) return mensaje;
      }
      if (typeof cuerpo === 'string' && cuerpo.trim()) return cuerpo.trim();
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const mensaje = String((error as { message?: unknown }).message ?? '').trim();
      if (mensaje) return mensaje;
    }

    return porDefecto;
  }
}
