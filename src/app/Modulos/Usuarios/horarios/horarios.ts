import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { horarioRequest, HorarioResponse, horarioSemanal, horarioTurno, listaDias } from './data/horarioInterfaz';
import { FormsModule } from '@angular/forms';
import { HorarioService } from './data/horario-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";

@Component({
  selector: 'app-horarios',
  imports: [CampoValidado, FormsModule, TabSwitch],
  templateUrl: './horarios.html',
  styleUrl: './horarios.scss',
})
export class Horarios implements OnInit {

  constructor(
    private horarioService: HorarioService,
    private cdr: ChangeDetectorRef,
    private popUps: PopUps
  ) {}

  // ------------------ VARIABLES ------------------
  isEditing = false;
  textoBusqueda = '';
  horarioSeleccionado: HorarioResponse | null = null;
  horarios: HorarioResponse[] = [];
  mostrarActivos = true;
  private horarioOriginalClave = '';

  dias = listaDias;

  horarioTurno: horarioTurno = {
    horasTrabajo: 0,
    horasDescanso: 0,
  };

  semanalDetalles: horarioSemanal[] = this.crearSemanalBase();

  horario: horarioRequest = {
    nombre: '',
    esRotativo: false,
    estado: true,
  };

  get isFormDisabled(): boolean {
    return this.horarioSeleccionado !== null && !this.isEditing;
  }

  get tituloFormulario(): string {
    if (!this.horarioSeleccionado) {
      return 'Agregar horario';
    }
    return this.isEditing ? 'Editar horario' : 'Ver horario';
  }

  get tieneCambios(): boolean {
    return this.isEditing && this.horarioOriginalClave !== this.obtenerClaveHorario();
  }

  get horariosFiltrados(): HorarioResponse[] {
    return this.horarios.filter((h) => {
      const coincideBusqueda =
        !this.textoBusqueda.trim() ||
        h.nombre.toLowerCase().includes(this.textoBusqueda.toLowerCase().trim()) ||
        (h.codigo && h.codigo.toLowerCase().includes(this.textoBusqueda.toLowerCase().trim()));
      return coincideBusqueda;
    });
  }

  // ------------------ MÉTODOS DE INICIALIZACIÓN ------------------
  ngOnInit() {
    this.getHorarios(true);
  }

  crearSemanalBase(): horarioSemanal[] {
    return this.dias.map((dia) => ({
      diaSemana: dia,
      horaEntrada: '00:00',
      horaSalida: '00:00',
    }));
  }

  getHorarios(activos: boolean): void {
    this.mostrarActivos = activos;
    this.horarioService.getHorarios(activos).subscribe({
      next: (data) => {
        this.horarios = data;
        if (this.horarios.length > 0) {
          this.seleccionarHorario(this.horarios[0]);
        } else {
          this.resetearFormulario();
        }
        this.cdr.detectChanges();
      }
    });
  }

  // ------------------ ACCIONES Y SELECCIÓN ------------------
  seleccionarHorario(item: HorarioResponse): void {
    this.horarioSeleccionado = item;
    this.isEditing = false;

    this.horario = {
      nombre: item.nombre,
      esRotativo: item.esRotativo,
      estado: item.estado,
    };

    if (item.esRotativo) {
      const turno = item.detalleTurno || item.turnoDetalle;
      this.horarioTurno = turno
        ? { horasTrabajo: turno.horasTrabajo, horasDescanso: turno.horasDescanso }
        : { horasTrabajo: 0, horasDescanso: 0 };
    } else {
      const detalles = item.semanalDetalles || item.detallesSemanales || [];
      this.semanalDetalles = this.dias.map((dia) => {
        const coincidencia = detalles.find((s: any) => s.diaSemana === dia || s.dia === dia);
        return {
          diaSemana: dia,
          horaEntrada: coincidencia?.horaEntrada || (coincidencia as any)?.horaInicio || '00:00',
          horaSalida: coincidencia?.horaSalida || (coincidencia as any)?.horaFin || '00:00',
        };
      });
    }

    this.horarioOriginalClave = this.obtenerClaveHorario();
  }

  activarEdicion(): void {
    if (this.horarioSeleccionado && !this.horarioSeleccionado.estado) {
      return;
    }
    this.isEditing = true;
  }

  cancelarAccion(): void {
    if (this.horarioSeleccionado && this.isEditing) {
      // Si estaba editando un card seleccionado, cancela los cambios y vuelve a vista de solo ver
      this.seleccionarHorario(this.horarioSeleccionado);
    } else {
      // Si estaba en solo ver o agregando, desselecciona y resetea al estado inicial
      this.resetearFormulario();
    }
  }

  resetearFormulario(): void {
    this.horarioSeleccionado = null;
    this.isEditing = false;
    this.horarioOriginalClave = '';
    this.horario = {
      nombre: '',
      esRotativo: false,
      estado: true,
    };
    this.horarioTurno = {
      horasTrabajo: 0,
      horasDescanso: 0,
    };
    this.semanalDetalles = this.crearSemanalBase();
  }

  guardarHorario(): void {
    this.determinarEsRotativo();

    this.horarioService.postHorario(this.horario).subscribe({
      next: (res) => {
        this.popUps.exito('Horario guardado exitosamente');
        this.recargarHorarios(res.id);
      },
      error: (error) => {
        this.popUps.errorDesdeBackend(error, 'Error al guardar el horario');
      }
    });
  }

  async actualizarHorario(): Promise<void> {
    if (!this.horarioSeleccionado || !this.isEditing) return;

    this.determinarEsRotativo();

    const confirmado = await this.popUps.confirmarToast('¿Desea actualizar el horario?');
    if (!confirmado) return;

    const id = this.horarioSeleccionado.id;
    this.horarioService.putHorario(id, this.horario).subscribe({
      next: () => {
        this.popUps.exito('Horario actualizado exitosamente');
        this.isEditing = false;
        this.recargarHorarios(id);
      },
      error: (error) => {
        this.popUps.errorDesdeBackend(error, 'Error al actualizar el horario');
      },
    });
  }

  async eliminarHorario(): Promise<void> {
    if (!this.horarioSeleccionado) return;

    const accion = this.horarioSeleccionado.estado ? 'desactivar' : 'activar';
    const confirmado = await this.popUps.confirmarToast(`¿Desea ${accion} el horario?`);
    if (!confirmado) return;

    this.horarioService.cambiarEstado(this.horarioSeleccionado.id).subscribe({
      next: () => {
        this.popUps.exito(`Horario ${accion === 'desactivar' ? 'desactivado' : 'activado'} exitosamente`);
        this.recargarHorarios();
      },
      error: (error) => {
        this.popUps.errorDesdeBackend(error, `Error al ${accion} el horario`);
      },
    });
  }

  private recargarHorarios(idSeleccionar?: number): void {
    this.horarioService.getHorarios(this.mostrarActivos).subscribe({
      next: (data) => {
        this.horarios = data;
        if (idSeleccionar) {
          const objetivo = this.horarios.find((h) => h.id === idSeleccionar);
          if (objetivo) {
            this.seleccionarHorario(objetivo);
          } else if (this.horarios.length > 0) {
            this.seleccionarHorario(this.horarios[0]);
          } else {
            this.resetearFormulario();
          }
        } else if (this.horarios.length > 0) {
          this.seleccionarHorario(this.horarios[0]);
        } else {
          this.resetearFormulario();
        }
        this.cdr.detectChanges();
      }
    });
  }

  determinarEsRotativo(): void{
    if (this.horario.esRotativo) {
      this.horario.turnoDetalle = this.horarioTurno;
      this.horario.semanalDetalles = undefined;
    } else {
      this.horario.semanalDetalles = this.semanalDetalles;
      this.horario.turnoDetalle = undefined;
    }
  }

  private obtenerClaveHorario(): string {
    return JSON.stringify({
      nombre: this.horario.nombre.trim(),
      esRotativo: this.horario.esRotativo,
      turno: this.horario.esRotativo
        ? {
            horasTrabajo: this.horarioTurno.horasTrabajo,
            horasDescanso: this.horarioTurno.horasDescanso,
          }
        : null,
      semanal: this.horario.esRotativo
        ? null
        : this.semanalDetalles.map((detalle) => ({
            diaSemana: detalle.diaSemana,
            horaEntrada: detalle.horaEntrada,
            horaSalida: detalle.horaSalida,
          })),
    });
  }

  // ------------------ GRUPOS DE DÍAS ------------------
  getPrimerGrupoDias(): horarioSemanal[] {
    return this.semanalDetalles.slice(0, 4);
  }

  getSegundoGrupoDias(): horarioSemanal[] {
    return this.semanalDetalles.slice(4);
  }
}
