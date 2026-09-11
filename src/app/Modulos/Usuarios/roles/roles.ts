import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";
import { CampoValidado } from "../../../shared/campo-validado/campo-validado";
import { RolService } from './data/rol-service';
import { ModuloResponse, RolRequest, RolResponse, PermisoRequest } from './data/rolInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule, TabSwitch, CampoValidado],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  isEditing = false;
  modulos: ModuloResponse[] = [];
  moduloSeleccionado: ModuloResponse | null = null;
  roles: RolResponse[] = [];
  rolSeleccionado: RolResponse | null = null;

  nombreRol = '';
  criterioBusqueda = '';
  mostrarActivos = true;

  permisosMap: Map<number, { id?: number; puedeLeer: boolean; puedeCrear: boolean; puedeEditar: boolean; puedeEliminar: boolean }> = new Map();

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
        // selecciona el primero si hay registros
        this.moduloSeleccionado = this.modulos.length > 0 ? this.modulos[0] : null;
        this.cdr.detectChanges();
      }
    });
  }

  cargarRoles(activos: boolean = this.mostrarActivos, idSeleccionar?: number): void {
    this.mostrarActivos = activos;
    this.rolService.getRoles(activos).subscribe({
      next: (data) => {
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

    this.rolService.buscarRoles(query, this.mostrarActivos).subscribe({
      next: (data) => {
        this.actualizarListaRoles(data);
      },
      error: (err) => {
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
    this.isEditing = false;
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

  activarEdicion(): void {
    if (this.rolSeleccionado && !this.rolSeleccionado.estado) {
      return;
    }
    this.isEditing = true;
  }

  cancelarAccion(): void {
    if (this.rolSeleccionado && this.isEditing) {
      this.seleccionarRol(this.rolSeleccionado);
    } else {
      this.resetearFormulario();
    }
  }

  resetearFormulario(): void {
    this.rolSeleccionado = null;
    this.isEditing = false;
    this.nombreRol = '';
    this.permisosMap.clear();
  }

  seleccionarModulo(modulo: ModuloResponse): void {
    this.moduloSeleccionado = modulo;
  }

  getPermiso(submoduloId: number, tipo: 'puedeLeer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'): boolean {
    return !!this.permisosMap.get(Number(submoduloId))?.[tipo];
  }

  setPermiso(submoduloId: number, tipo: 'puedeLeer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar', event: Event): void {
    if (this.isFormDisabled) return;
    const idNum = Number(submoduloId);
    const checked = (event.target as HTMLInputElement).checked;
    const actual = this.permisosMap.get(idNum) || {
      puedeLeer: false,
      puedeCrear: false,
      puedeEditar: false,
      puedeEliminar: false,
    };
    actual[tipo] = checked;
    if (tipo !== 'puedeLeer' && checked) {
      actual.puedeLeer = true;
    }
    if (tipo === 'puedeLeer' && !checked) {
      actual.puedeCrear = false;
      actual.puedeEditar = false;
      actual.puedeEliminar = false;
    }
    this.permisosMap.set(idNum, actual);
  }

  isFormValido(): boolean {
    return !!this.nombreRol && this.nombreRol.trim().length > 0;
  }

  hayCambios(): boolean {
    if (!this.rolSeleccionado) return false;

    if (this.nombreRol.trim() !== (this.rolSeleccionado.nombre || '').trim()) {
      return true;
    }

    const permisosOriginales = new Map<number, { puedeLeer: boolean; puedeCrear: boolean; puedeEditar: boolean; puedeEliminar: boolean }>();
    if (this.rolSeleccionado.permisos) {
      this.rolSeleccionado.permisos.forEach((p) => {
        permisosOriginales.set(Number(p.submoduloId), {
          puedeLeer: !!p.puedeLeer,
          puedeCrear: !!p.puedeCrear,
          puedeEditar: !!p.puedeEditar,
          puedeEliminar: !!p.puedeEliminar,
        });
      });
    }

    const todosSubmoduloIds = new Set<number>([
      ...permisosOriginales.keys(),
      ...this.permisosMap.keys(),
    ]);

    for (const subId of todosSubmoduloIds) {
      const orig = permisosOriginales.get(subId) || { puedeLeer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
      const actual = this.permisosMap.get(subId) || { puedeLeer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };

      if (
        orig.puedeLeer !== !!actual.puedeLeer ||
        orig.puedeCrear !== !!actual.puedeCrear ||
        orig.puedeEditar !== !!actual.puedeEditar ||
        orig.puedeEliminar !== !!actual.puedeEliminar
      ) {
        return true;
      }
    }

    return false;
  }

  get isFormDisabled(): boolean {
    return this.rolSeleccionado !== null && !this.isEditing;
  }

  get tituloFormulario(): string {
    if (!this.rolSeleccionado) {
      return 'Agregar rol';
    }
    return this.isEditing ? 'Editar rol' : 'Ver rol';
  }

  crearRol(): void {
    if (!this.isFormValido()) return;

    const rolReq: RolRequest = {
      nombre: this.nombreRol.trim(),
      estado: true,
      permisos: this.obtenerPermisos(false),
    };

    this.rolService.postRol(rolReq).subscribe({
      next: (res) => {
        this.popUps.exito('Rol guardado exitosamente');
        this.recargarRoles(res.id);
      },
      error: (err) => {
        this.popUps.errorDesdeBackend(err, 'Error al guardar el rol');
      },
    });
  }

  async actualizarRol(): Promise<void> {
    if (!this.rolSeleccionado || !this.isFormValido()) return;

    const confirmado = await this.popUps.confirmarToast('¿Desea actualizar este rol?');
    if (!confirmado) return;

    const rolReq: RolRequest = {
      nombre: this.nombreRol.trim(),
      estado: true,
      permisos: this.obtenerPermisos(true),
    };

    const id = this.rolSeleccionado.id;
    this.rolService.putRol(id, rolReq).subscribe({
      next: () => {
        this.popUps.exito('Rol actualizado exitosamente');
        this.isEditing = false;
        this.recargarRoles(id);
      },
      error: (err) => {
        this.popUps.errorDesdeBackend(err, 'Error al actualizar el rol');
      },
    });
  }

  private obtenerPermisos(incluirId: boolean): PermisoRequest[] {
    const permisosMapUnicos = new Map<number, PermisoRequest>();

    this.permisosMap.forEach((perm, rawSubmoduloId) => {
      const subId = Number(rawSubmoduloId);
      if (perm.puedeLeer || perm.puedeCrear || perm.puedeEditar || perm.puedeEliminar) {
        const item: PermisoRequest = {
          submoduloId: subId,
          puedeLeer: !!perm.puedeLeer,
          puedeCrear: !!perm.puedeCrear,
          puedeEditar: !!perm.puedeEditar,
          puedeEliminar: !!perm.puedeEliminar,
        };
        if (incluirId && perm.id) {
          item.id = perm.id;
        }
        permisosMapUnicos.set(subId, item);
      }
    });

    return Array.from(permisosMapUnicos.values());
  }

  async cambiarEstadoRol(): Promise<void> {
    if (!this.rolSeleccionado) return;

    const accion = this.rolSeleccionado.estado ? 'desactivar' : 'activar';
    const confirmado = await this.popUps.confirmarToast(`¿Desea ${accion} este rol?`);
    if (!confirmado) return;

    this.rolService.cambiarEstado(this.rolSeleccionado.id).subscribe({
      next: () => {
        this.popUps.exito(`Rol ${accion === 'desactivar' ? 'desactivado' : 'activado'} exitosamente`);
        this.recargarRoles();
      },
      error: (err) => {
        this.popUps.errorDesdeBackend(err, `Error al ${accion} el rol`);
      }
    });
  }

  private recargarRoles(idSeleccionar?: number): void {
    if (this.criterioBusqueda.trim()) {
      this.buscarRoles();
    } else {
      this.cargarRoles(this.mostrarActivos, idSeleccionar);
    }
  }
}
