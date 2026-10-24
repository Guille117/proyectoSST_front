import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TimeoutError, forkJoin } from 'rxjs';
import { PacienteDetalle, TipoAtencion } from '../paciente/data/pacienteInterfaz';
import { PacienteService } from '../paciente/data/paciente-service';
import { EpisodioResumen } from './data/expedienteInterfaz';
import { ExpedienteService } from './data/expediente-service';
import { ResumenEpisodio } from './resumen-episodio/resumen-episodio';

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
  episodios: EpisodioResumen[] = [];
  episodioSeleccionado: EpisodioResumen | null = null;
  cargando = false;
  error = '';

  ngOnInit(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
      this.error = 'No se pudo identificar al paciente del expediente.';
      return;
    }
    this.cargar(pacienteId);
  }

  seleccionarEpisodio(episodio: EpisodioResumen): void {
    this.episodioSeleccionado = episodio;
    this.cdr.detectChanges();
  }

  esSeleccionado(episodio: EpisodioResumen): boolean {
    return this.episodioSeleccionado?.episodioId === episodio.episodioId;
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
          this.episodios = episodios;
          this.episodioSeleccionado =
            episodios.find((episodio) => episodio.activo) ?? episodios[0] ?? null;
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
