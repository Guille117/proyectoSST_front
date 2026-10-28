import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";
import { CampoValidado } from "../../../shared/campo-validado/campo-validado";
import { RolService } from './data/rol-service';
import { ModuloResponse, RolResponse } from './data/rolInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule, TabSwitch, CampoValidado],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  modulos: ModuloResponse[] = [];
  moduloSeleccionado: ModuloResponse | null = null;
  roles: RolResponse[] = [];
  rolSeleccionado: RolResponse | null = null;

  nombreRol = '';
  criterioBusqueda = '';
  mostrarActivos = true;

  permisosMap: Map<number, { id?: number; puedeLeer: boolean; puedeCrear: boolean; puedeEditar: boolean; puedeEliminar: boolean }> = new Map();
  private solicitudRoles = 0;

  constructor(
    private rolService: RolService,
    private cdr: ChangeDetectorRef,
    private popUps: PopUps
  ) {}

  ngOnInit(): void {
    this.cargarModulos();
    this.cargarRoles(true);
  }

  cargarModulos(): void {
    this.rolService.getModulos().subscribe({
      next: (data) => {
        this.modulos = data ?? [];
        this.moduloSeleccionado = this.modulos.length > 0 ? this.modulos[0] : null;
        this.cdr.detectChanges();
      }
    });
  }

  cargarRoles(activos: boolean = this.mostrarActivos, idSeleccionar?: number): void {
    this.mostrarActivos = activos;
    const solicitud = ++this.solicitudRoles;
    this.rolService.getRoles(activos).subscribe({
      next: (data) => {
        if (solicitud !== this.solicitudRoles) return;
        this.actualizarListaRoles(data, idSeleccionar);
      }
    });
  }

  buscarRoles(): void {
    const query = this.criterioBusqueda.trim();
    if (!query) {
      this.cargarRoles(this.mostrarActivos);
      return;
    }

    const solicitud = ++this.solicitudRoles;
    this.rolService.buscarRoles(query, this.mostrarActivos).subscribe({
      next: (data) => {
        if (solicitud !== this.solicitudRoles) return;
        this.actualizarListaRoles(data);
      },
      error: (err) => {
        if (solicitud !== this.solicitudRoles) return;
        this.popUps.errorDesdeBackend(err, 'Error al buscar roles');
      }
    });
  }

  cambiarTab(activos: boolean): void {
    this.mostrarActivos = activos;
    if (this.criterioBusqueda.trim()) {
      this.buscarRoles();
    } else {
      this.cargarRoles(activos);
    }
  }

  private actualizarListaRoles(data: RolResponse[], idSeleccionar?: number): void {
    this.roles = data;
    if (idSeleccionar) {
      const objetivo = this.roles.find((r) => r.id === idSeleccionar);
      if (objetivo) {
        this.seleccionarRol(objetivo);
      } else if (this.roles.length > 0) {
        this.seleccionarRol(this.roles[0]);
      } else {
        this.resetearFormulario();
      }
    } else if (this.roles.length > 0) {
      this.seleccionarRol(this.roles[0]);
    } else {
      this.resetearFormulario();
    }
    this.cdr.detectChanges();
  }

  seleccionarRol(rol: RolResponse): void {
    this.rolSeleccionado = rol;
    this.nombreRol = rol.nombre;
    this.permisosMap.clear();

    if (rol.permisos) {
      rol.permisos.forEach((p) => {
        this.permisosMap.set(Number(p.submoduloId), {
          id: p.id,
          puedeLeer: !!p.puedeLeer,
          puedeCrear: !!p.puedeCrear,
          puedeEditar: !!p.puedeEditar,
          puedeEliminar: !!p.puedeEliminar,
        });
      });
    }
  }

  resetearFormulario(): void {
    this.rolSeleccionado = null;
    this.nombreRol = '';
    this.permisosMap.clear();
  }

  seleccionarModulo(modulo: ModuloResponse): void {
    this.moduloSeleccionado = modulo;
  }

  getPermiso(submoduloId: number, tipo: 'puedeLeer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'): boolean {
    return !!this.permisosMap.get(Number(submoduloId))?.[tipo];
  }

  get tituloFormulario(): string {
    if (!this.rolSeleccionado) {
      return 'Roles del sistema';
    }
    return 'Ver detalles de rol ' + this.rolSeleccionado.codigo;
  }
}
