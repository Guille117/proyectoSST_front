import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalAgregarUusuario } from './modal-agregar-uusuario/modal-agregar-uusuario';
import { UsuarioService } from './data/usuario-service';
import { UsuarioListadoResponse, UsuarioResponse } from './data/usuarioInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ModalPopUps } from '../../../shared/popUps/modal-popUpsService';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { AuthService } from '../../Auth/data/auth-service';

@Component({
  selector: 'app-usu',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './usu.html',
  styleUrl: './usu.scss',
})
export class Usu implements OnInit {
  private modalServ = inject(ModalService);
  private usuarioService = inject(UsuarioService);
  private popUps = inject(PopUps);
  private modalPopUps = inject(ModalPopUps);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  usuarios: UsuarioListadoResponse[] = [];
  usuariosTodos: UsuarioListadoResponse[] = [];
  usuarioSeleccionado: UsuarioResponse | null = null;
  mostrarActivos = true;
  criterioBusqueda = '';
  paginaActual = 1;
  cantidadMostrar = 5;

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

  private actualizarListaUsuarios(data: UsuarioListadoResponse[]): void {
    this.usuariosTodos = data;
    this.paginaActual = 1;
    this.actualizarPagina();
  }

  actualizarPagina(pagina: number = this.paginaActual): void {
    const totalPaginas = Math.max(1, Math.ceil(this.usuariosTodos.length / this.cantidadMostrar));
    this.paginaActual = Math.min(Math.max(pagina, 1), totalPaginas);

    const inicio = (this.paginaActual - 1) * this.cantidadMostrar;
    this.usuarios = this.usuariosTodos.slice(inicio, inicio + this.cantidadMostrar);
    const primerUsuario = this.usuarios[0];

    if (!primerUsuario) {
      this.usuarioSeleccionado = null;
      this.cdr.detectChanges();
      return;
    }

    this.seleccionarUsuario(primerUsuario);
    this.cdr.detectChanges();
  }

  seleccionarUsuario(user: UsuarioListadoResponse): void {
    this.usuarioService.getUsuarioById(user.id).subscribe({
      next: (fullUser) => {
        this.usuarioSeleccionado = fullUser;
        this.cdr.detectChanges();
      },
      error: (err) => this.popUps.errorDesdeBackend(err, 'Error al cargar el detalle del usuario'),
    });
  }

  esUsuarioActual(user: UsuarioListadoResponse | UsuarioResponse): boolean {
    return this.authService.currentUser()?.id === user.id;
  }

  async abrirRestablecerContrasena(user: UsuarioResponse): Promise<void> {
    const password = await this.popUps.solicitarContrasena();
    const usuarioActualId = this.authService.currentUser()?.id;

    if (!password || !usuarioActualId) return;

    this.authService.solicitarCambioCredenciales({
      usuarioId: user.id,
      usuarioActualId,
      passwordActual: password,
    }).subscribe({
      next: (respuesta) => {
        const pin = typeof respuesta === 'object' ? respuesta.pin : respuesta;
        this.modalPopUps.usuarioCreado(pin, 'Contraseña restablecida');
      },
      error: (err) => this.popUps.errorDesdeBackend(err, 'No se pudo restablecer la contraseña.'),
    });
  }

  async cambiarEstadoUsuario(event: Event, user: UsuarioListadoResponse): Promise<void> {
    const switchElement = event.target as HTMLInputElement;
    switchElement.checked = user.estado;

    const accion = user.estado ? 'inhabilitar' : 'habilitar';
    const confirmado = await this.popUps.confirmarToast(`¿Desea ${accion} este usuario?`);
    if (!confirmado) return;

    this.usuarioService.cambiarEstado(user.id).subscribe({
      next: () => {
        this.popUps.exito(`Usuario ${accion === 'inhabilitar' ? 'inhabilitado' : 'habilitado'} exitosamente.`);
        this.cargarUsuarios(this.mostrarActivos);
      },
      error: (err) => {
        this.popUps.errorDesdeBackend(err, `Error al ${accion} el usuario`);
      },
    });
  }

  abrirModalAgregar(): void {
    this.modalServ.open(ModalAgregarUusuario, {
      title: 'Agregar usuario',
      isEditing: false,
      onSuccess: () => this.cargarUsuarios(this.mostrarActivos)
    });
  }

  abrirModalEditar(user: UsuarioListadoResponse): void {
    this.usuarioService.getUsuarioById(user.id).subscribe({
      next: (fullUser) => this.modalServ.open(ModalAgregarUusuario, {
        title: 'Editar usuario',
        subtitle: 'Paso 1 de 2: Datos personales',
        isEditing: true,
        usuarioToEdit: fullUser,
        onSuccess: () => this.cargarUsuarios(this.mostrarActivos)
      }),
      error: (err) => this.popUps.errorDesdeBackend(err, 'Error al cargar el detalle del usuario'),
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

  getNombreCompleto(user: UsuarioListadoResponse | null): string {
    return user?.nombreCompleto || 'N/A';
  }

  getCui(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.cui || user.persona?.cui || 'N/A';
  }

  getFechaNacimiento(user: UsuarioResponse | null): string {
    if (!user) return '';
    return user.fechaNacimiento || user.persona?.fechaNacimiento || '';
  }

  getTelefono(user: UsuarioListadoResponse | UsuarioResponse | null): string {
    if (!user) return 'N/A';
    if ('persona' in user) {
      return user.telefono || user.persona?.telefono || 'N/A';
    }
    return user.telefono || 'N/A';
  }

  getEmail(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.email || user.persona?.email || 'N/A';
  }

  getPuesto(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.puesto?.nombre || user.puestoNombre || 'N/A';
  }

  esMedicoUsuario(user: UsuarioResponse | null): boolean {
    return this.getPuesto(user)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes('medic');
  }

  getEspecialidad(user: UsuarioResponse | null): string {
    const datos = user as unknown as {
      especialidad?: string | { nombre?: string };
      especialidadNombre?: string;
    } | null;

    if (!datos) return 'N/A';
    if (typeof datos.especialidad === 'string') return datos.especialidad || 'N/A';
    return datos.especialidad?.nombre || datos.especialidadNombre || 'N/A';
  }

  getHorario(user: UsuarioResponse | null): string {
    if (!user) return 'N/A';
    return user.horario?.nombre || user.horarioNombre || 'N/A';
  }

  getRol(user: UsuarioListadoResponse | UsuarioResponse | null): string {
    if (!user) return 'N/A';

    if (user.roles?.length) {
      return user.roles.map((rol) => typeof rol === 'string' ? rol : rol.nombre).join(', ');
    }

    if ('rol' in user) {
      return user.rol?.nombre || user.rolNombre || 'N/A';
    }

    return 'N/A';
  }

  // restablecer contraseña
  

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
