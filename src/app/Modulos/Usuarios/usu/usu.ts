import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalAgregarUusuario } from './modal-agregar-uusuario/modal-agregar-uusuario';
import { UsuarioService } from './data/usuario-service';
import { UsuarioResponse } from './data/usuarioInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-usu',
  imports: [CommonModule, FormsModule, TabSwitch],
  templateUrl: './usu.html',
  styleUrl: './usu.scss',
})
export class Usu implements OnInit {
  private modalServ = inject(ModalService);
  private usuarioService = inject(UsuarioService);
  private popUps = inject(PopUps);
  private cdr = inject(ChangeDetectorRef);

  usuarios: UsuarioResponse[] = [];
  usuarioSeleccionado: UsuarioResponse | null = null;
  mostrarActivos = true;
  criterioBusqueda = '';

  ngOnInit(): void {
    this.cargarUsuarios(true);
  }

  cargarUsuarios(activos: boolean = this.mostrarActivos): void {
    this.mostrarActivos = activos;
    this.usuarioService.getUsuarios(activos).subscribe({
      next: (data) => this.actualizarListaUsuarios(data),
      error: (err) => this.popUps.errorDesdeBackend(err, 'Error al cargar los usuarios'),
    });
  }

  buscarUsuarios(): void {
    const query = this.criterioBusqueda.trim();
    if (!query) {
      this.cargarUsuarios(this.mostrarActivos);
      return;
    }

    this.usuarioService.buscarUsuarios(query, this.mostrarActivos).subscribe({
      next: (data) => this.actualizarListaUsuarios(data),
      error: (err) => this.popUps.errorDesdeBackend(err, 'Error al buscar usuarios'),
    });
  }

  cambiarTab(activos: boolean): void {
    this.mostrarActivos = activos;
    if (this.criterioBusqueda.trim()) {
      this.buscarUsuarios();
    } else {
      this.cargarUsuarios(activos);
    }
  }

  private actualizarListaUsuarios(data: UsuarioResponse[]): void {
    this.usuarios = data;
    // this.actualizarSeleccion();
    this.cdr.detectChanges();
  }

  seleccionarUsuario(user: UsuarioResponse): void {
    this.usuarioSeleccionado = user;
    this.usuarioService.getUsuarioById(user.id).subscribe({
      next: (fullUser) => {
        this.usuarioSeleccionado = fullUser;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  abrirModalAgregar(): void {
    this.modalServ.open(ModalAgregarUusuario, {
      title: 'Agregar usuario',
      subtitle: 'Paso 1 de 2: Datos personales',
      isEditing: false,
      onSuccess: () => this.cargarUsuarios(this.mostrarActivos)
    });
  }

  abrirModalEditar(): void {
    if (!this.usuarioSeleccionado) return;
    this.modalServ.open(ModalAgregarUusuario, {
      title: 'Editar usuario',
      subtitle: 'Paso 1 de 2: Datos personales',
      isEditing: true,
      usuarioToEdit: this.usuarioSeleccionado,
      onSuccess: () => this.cargarUsuarios(this.mostrarActivos)
    });
  }

  async cambiarEstadoUsuario(): Promise<void> {
    if (!this.usuarioSeleccionado) return;

    const accion = this.usuarioSeleccionado.estado ? 'inhabilitar' : 'habilitar';
    const confirmado = await this.popUps.confirmarToast(`¿Desea ${accion} este usuario?`);
    if (!confirmado) return;

    this.usuarioService.cambiarEstado(this.usuarioSeleccionado.id).subscribe({
      next: () => {
        this.popUps.exito(`Usuario ${accion === 'inhabilitar' ? 'inhabilitado' : 'habilitado'} exitosamente.`);
        this.cargarUsuarios(this.mostrarActivos);
      },
      error: (err) => {
        this.popUps.errorDesdeBackend(err, `Error al ${accion} el usuario`);
      },
    });
  }

  getNombres(user: UsuarioResponse | null): string {
    if (!user) return '';
    return user.nombres || user.persona?.nombres || '';
  }

  getApellidos(user: UsuarioResponse | null): string {
    if (!user) return '';
    return user.apellidos || user.persona?.apellidos || '';
  }

  getNombreCompleto(user: UsuarioResponse | null): string {
    if (!user) return '';
    const nom = this.getNombres(user);
    const ape = this.getApellidos(user);
    return `${nom} ${ape}`.trim() || 'N/A';
  }

  getCui(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.cui || user.persona?.cui || 'N/A';
  }

  getFechaNacimiento(user: UsuarioResponse | null): string {
    if (!user) return '';
    return user.fechaNacimiento || user.persona?.fechaNacimiento || '';
  }

  getTelefono(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.telefono || user.persona?.telefono || 'N/A';
  }

  getEmail(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.email || user.persona?.email || 'N/A';
  }

  getPuesto(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.puesto?.nombre || user.puestoNombre || 'N/A';
  }

  getHorario(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.horario?.nombre || user.horarioNombre || 'N/A';
  }

  getRol(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.rol?.nombre || user.rolNombre || 'N/A';
  }

  calcularEdad(fechaNacimiento?: string): number | string {
    if (!fechaNacimiento) return 'N/A';
    const nac = new Date(fechaNacimiento);
    if (isNaN(nac.getTime())) return 'N/A';
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad >= 0 ? edad : 'N/A';
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return 'N/A';
    const parts = fecha.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fecha;
  }
}
