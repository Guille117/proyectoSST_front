import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { ConfiguracionService } from '../data/configuracion-service';
import { PerfilConfiguracion } from '../data/configuracionInterfaz';
import { PersonaDatos, Sexo } from '../../Usuarios/usu/data/usuarioInterfaz';

@Component({
  selector: 'app-configuracion',
  imports: [CommonModule, FormsModule, CampoValidado],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class Configuracion implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly authService = inject(AuthService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('datosForm') private datosForm?: NgForm;
  @ViewChild('nombreUsuarioForm') private nombreUsuarioForm?: NgForm;
  @ViewChild('contrasenaForm') private contrasenaForm?: NgForm;

  readonly passwordMinLength = 8;

  cargando = false;
  guardandoPerfil = false;
  actualizandoUsuario = false;
  cambiandoPassword = false;

  perfil: PerfilConfiguracion | null = null;
  datosPersonales: PersonaDatos = this.crearDatosPersonalesVacios();
  usuarioForm = { username: '' };
  passwordForm = { passwordActual: '', passwordNueva: '', confirmarPassword: '' };

  mostrarPasswordActual = false;
  mostrarPasswordNueva = false;
  mostrarConfirmarPassword = false;

  private datosOriginales = '';
  private usernameOriginal = '';

  ngOnInit(): void {
    this.cargarPerfil();
  }

  get nombreCompleto(): string {
    const nombres = this.datosPersonales.nombres || this.perfil?.nombres || '';
    const apellidos = this.datosPersonales.apellidos || this.perfil?.apellidos || '';
    return `${nombres} ${apellidos}`.trim() || (this.perfil?.codigo ?? 'Usuario');
  }

  get iniciales(): string {
    const partes = this.nombreCompleto.split(/\s+/).filter(Boolean);
    if (!partes.length) {
      return 'US';
    }
    const primera = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
    return `${primera}${ultima}`.toUpperCase();
  }

  get rolesTexto(): string {
    if (this.perfil?.roles?.length) {
      return this.perfil.roles
        .map((rol) => (typeof rol === 'string' ? rol : rol.nombre))
        .join(', ');
    }
    return this.perfil?.rol?.nombre || this.perfil?.rolNombre || 'Sin roles';
  }

  get puestoTexto(): string {
    return this.perfil?.puesto?.nombre || this.perfil?.puestoNombre || 'No asignado';
  }

  get horarioTexto(): string {
    return this.perfil?.horario?.nombre || this.perfil?.horarioNombre || 'No asignado';
  }

  get hayCambiosPerfil(): boolean {
    return this.crearSnapshot() !== this.datosOriginales;
  }

  get hayCambiosUsuario(): boolean {
    return (this.usuarioForm.username ?? '').trim() !== this.usernameOriginal;
  }

  get passwordCorta(): boolean {
    return (
      this.passwordForm.passwordNueva.length > 0 &&
      this.passwordForm.passwordNueva.length < this.passwordMinLength
    );
  }

  get passwordsDistintas(): boolean {
    return (
      this.passwordForm.confirmarPassword.length > 0 &&
      this.passwordForm.passwordNueva !== this.passwordForm.confirmarPassword
    );
  }

  get passwordsValidas(): boolean {
    return (
      this.passwordForm.passwordActual.length > 0 &&
      this.passwordForm.passwordNueva.length >= this.passwordMinLength &&
      this.passwordForm.passwordNueva === this.passwordForm.confirmarPassword
    );
  }

  togglePasswordActual(): void {
    this.mostrarPasswordActual = !this.mostrarPasswordActual;
  }

  togglePasswordNueva(): void {
    this.mostrarPasswordNueva = !this.mostrarPasswordNueva;
  }

  toggleConfirmarPassword(): void {
    this.mostrarConfirmarPassword = !this.mostrarConfirmarPassword;
  }

  cargarPerfil(): void {
    this.cargando = true;
    this.configuracionService
      .obtenerPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.perfil = perfil;
          this.datosPersonales = this.datosDesdePerfil(perfil);
          this.usuarioForm.username = perfil.username || '';
          this.usernameOriginal = this.usuarioForm.username;
          this.datosOriginales = this.crearSnapshot();
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.popUps.errorDesdeBackend(err, 'No se pudo cargar tu información.');
          this.cdr.markForCheck();
        },
      });
  }

  descartarCambiosPerfil(): void {
    if (!this.perfil) {
      return;
    }
    this.datosPersonales = this.datosDesdePerfil(this.perfil);
    this.datosForm?.resetForm(this.datosPersonales);
    this.cdr.markForCheck();
  }

  guardarPerfil(): void {
    if (this.guardandoPerfil || !this.hayCambiosPerfil) {
      return;
    }

    const request: PersonaDatos = {
      ...this.datosPersonales,
      cui: this.datosPersonales.cui.trim(),
      nombres: this.datosPersonales.nombres.trim(),
      apellidos: this.datosPersonales.apellidos.trim(),
      telefono: this.datosPersonales.telefono?.trim() || undefined,
      email: this.datosPersonales.email?.trim() || undefined,
    };

    this.guardandoPerfil = true;
    this.cdr.markForCheck();

    this.configuracionService
      .actualizarPerfil(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.perfil = perfil;
          this.datosPersonales = this.datosDesdePerfil(perfil);
          this.datosOriginales = this.crearSnapshot();
          this.datosForm?.form.markAsPristine();
          this.authService.actualizarSesion({ nombreCompleto: this.nombreCompleto });
          this.guardandoPerfil = false;
          this.popUps.exito('Datos personales actualizados.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardandoPerfil = false;
          this.popUps.errorDesdeBackend(err, 'No se pudieron guardar los datos personales.');
          this.cdr.markForCheck();
        },
      });
  }

  actualizarUsuario(): void {
    if (this.actualizandoUsuario || !this.hayCambiosUsuario) {
      return;
    }

    const username = this.usuarioForm.username.trim();
    this.actualizandoUsuario = true;
    this.cdr.markForCheck();

    this.configuracionService
      .cambiarUsuario({ username })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.usuarioForm.username = respuesta.username;
          this.usernameOriginal = respuesta.username;
          if (this.perfil) {
            this.perfil.username = respuesta.username;
          }
          this.nombreUsuarioForm?.form.markAsPristine();
          this.actualizarSesionUsuario(respuesta);
          this.actualizandoUsuario = false;
          this.popUps.exito('Nombre de usuario actualizado.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.actualizandoUsuario = false;
          this.popUps.errorDesdeBackend(err, 'No se pudo actualizar el nombre de usuario.');
          this.cdr.markForCheck();
        },
      });
  }

  cambiarPassword(): void {
    if (this.cambiandoPassword || !this.passwordsValidas) {
      return;
    }

    this.cambiandoPassword = true;
    this.cdr.markForCheck();

    this.configuracionService
      .cambiarPassword({
        passwordActual: this.passwordForm.passwordActual,
        passwordNueva: this.passwordForm.passwordNueva,
        confirmarPassword: this.passwordForm.confirmarPassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordForm = {
            passwordActual: '',
            passwordNueva: '',
            confirmarPassword: '',
          };
          this.contrasenaForm?.resetForm();
          this.cambiandoPassword = false;
          this.popUps.exito('Contraseña actualizada correctamente.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cambiandoPassword = false;
          this.popUps.errorDesdeBackend(err, 'No se pudo cambiar la contraseña.');
          this.cdr.markForCheck();
        },
      });
  }

  private actualizarSesionUsuario(respuesta: {
    token: string;
    username: string;
  }): void {
    this.authService.actualizarSesion({ username: respuesta.username }, respuesta.token);
  }

  private crearDatosPersonalesVacios(): PersonaDatos {
    return {
      cui: '',
      nombres: '',
      apellidos: '',
      sexo: 'MASCULINO',
      fechaNacimiento: '',
      telefono: '',
      email: '',
    };
  }

  private datosDesdePerfil(perfil: PerfilConfiguracion): PersonaDatos {
    return {
      cui: perfil.cui || perfil.persona?.cui || '',
      nombres: perfil.nombres || perfil.persona?.nombres || '',
      apellidos: perfil.apellidos || perfil.persona?.apellidos || '',
      sexo: (perfil.sexo || perfil.persona?.sexo || 'MASCULINO') as Sexo,
      fechaNacimiento:
        perfil.fechaNacimiento || perfil.persona?.fechaNacimiento || '',
      telefono: perfil.telefono || perfil.persona?.telefono || '',
      email: perfil.email || perfil.persona?.email || '',
    };
  }

  private crearSnapshot(): string {
    return JSON.stringify({
      cui: this.datosPersonales.cui.trim(),
      nombres: this.datosPersonales.nombres.trim(),
      apellidos: this.datosPersonales.apellidos.trim(),
      sexo: this.datosPersonales.sexo,
      fechaNacimiento: this.datosPersonales.fechaNacimiento,
      telefono: (this.datosPersonales.telefono ?? '').trim(),
      email: (this.datosPersonales.email ?? '').trim(),
    });
  }
}
