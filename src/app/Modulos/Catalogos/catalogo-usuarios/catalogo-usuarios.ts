import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../data/serviceCatalogo';
import { Nombre, NombreGet } from '../data/nombreInterfaz';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-catalogo-usuarios',
  imports: [CommonModule, FormsModule, TabSwitch],
  templateUrl: './catalogo-usuarios.html',
  styleUrl: './catalogo-usuarios.scss',
})
export class CatalogoUsuarios implements OnInit {
  private readonly url = 'puestos';
  private readonly catalogoService: CatalogoService<Nombre, NombreGet>;

  puestos: NombreGet[] = [];
  puesto: Nombre = { nombre: '' };
  puestoSeleccionado: NombreGet | null = null;
  mostrarActivos = true;
  modoEdicion = false;
  enProceso = false;

  constructor(catalogoService: CatalogoService<Nombre, NombreGet>,  private cdr: ChangeDetectorRef, private popUps: PopUps) {
    this.catalogoService = catalogoService;
  }

  ngOnInit(): void {
    this.mostrarPuestos(true);
  }

  mostrarPuestos(activo: boolean): void {
    this.mostrarActivos = activo;

    this.catalogoService.listar(this.url, activo).subscribe({
      next: (data) => {
        this.puestos = data;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarPuesto(puesto: NombreGet): void {
    if (!this.mostrarActivos) {
      return;
    }

    this.puestoSeleccionado = puesto;
    this.puesto = { nombre: puesto.nombre };
    this.modoEdicion = true;
  }

  guardarPuesto() {
    if (!this.modoEdicion && this.puesto.nombre != ''){
      this.catalogoService.crear(this.url, this.puesto).subscribe({
        next: () => {
          this.popUps.exito('Puesto agregado exitosamente.');
          this.resetFormulario();
          this.mostrarPuestos(this.mostrarActivos);
          this.enProceso = false;
        },
        error: (error) => {
          this.enProceso = false;
          this.popUps.errorDesdeBackend(error, 'No se pudo guardar el puesto.');
        },
      });
    }
  }

  async actualizarPuesto() {
    const confirmado = await this.popUps.confirmarToast('¿Desea actualizar este puesto?');
    if(confirmado){
      this.catalogoService.actualizar(this.url, this.puestoSeleccionado!.id, this.puesto).subscribe({
        next: () => {
          this.popUps.exito('Puesto actualizado exitosamente.');
          this.resetFormulario();
          this.mostrarPuestos(this.mostrarActivos);
        },
        error: (error) => {
          this.popUps.errorDesdeBackend(error, 'No se pudo actualizar el puesto.');
        },
      });
    }
  }

  async cambiarEstadoPuesto(puesto: NombreGet): Promise<void> {
    const accion = this.mostrarActivos ? 'desactivar' : 'activar';
    const confirmado = await this.popUps.confirmarToast(
      `¿Deseas ${accion} el puesto "${puesto.nombre}"?`,
      'Confirmación',
    );
    if (!confirmado) {
      return;
    }

    this.enProceso = true;
    this.catalogoService.cambiarEstado(this.url, puesto.id).subscribe({
      next: () => {
        this.popUps.exito(`Puesto ${this.mostrarActivos ? 'desactivado' : 'activado'} exitosamente.`);
        this.resetFormulario();
        this.mostrarPuestos(this.mostrarActivos);
        this.enProceso = false;
      },
      error: (error) => {
        this.enProceso = false;
        this.popUps.errorDesdeBackend(error, 'No se pudo cambiar el estado del puesto.');
      },
    });
  }

  resetFormulario(): void {
    this.puesto = { nombre: '' };
    this.puestoSeleccionado = null;
    this.modoEdicion = false;
  }

  get formularioValido(): boolean {
    return this.puesto.nombre.trim().length > 0;
  }

  get hayCambiosEnEdicion(): boolean {
    if (!this.modoEdicion || !this.puestoSeleccionado) {
      return true;
    }

    return this.puesto.nombre.trim() !== this.puestoSeleccionado.nombre.trim();
  }

  get tituloFormulario(): string {
    return this.modoEdicion ? 'Editar puesto' : 'Agregar puesto';
  }
}