import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly passwordMinLength = 8;
  private authService = inject(AuthService);
  private router = inject(Router);
  private popUps = inject(PopUps);
  private cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  showCredentialRecovery = false;
  mostrarModalPin = false;
  pinAdministrador = '';
  intentosPin = 0;
  mensajePin = '';
  errorMessage = '';
  loading = false;

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleCredentialRecovery(): void {
    this.showCredentialRecovery = !this.showCredentialRecovery;
    this.errorMessage = '';
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  cerrarModalPin(): void {
    this.mostrarModalPin = false;
    this.pinAdministrador = '';
    this.mensajePin = '';
  }

  solicitarCambioCredenciales(): void {
    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Completa el usuario y la contraseña';
      return;
    }

    if (this.password.length < this.passwordMinLength) {
      this.errorMessage = `La contraseña debe tener al menos ${this.passwordMinLength} caracteres.`;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.errorMessage = '';
    this.intentosPin = 0;
    this.pinAdministrador = '';
    this.mensajePin = '';
    this.mostrarModalPin = true;
  }

  validarPin(): void {
    if (this.loading || this.intentosPin >= 3) {
      return;
    }

    if (this.pinAdministrador.length !== 6 || !/^\d{6}$/.test(this.pinAdministrador)) {
      this.registrarIntentoFallido('El PIN debe tener 6 dígitos.');
      return;
    }

    this.loading = true;
    this.mensajePin = '';

    this.authService.establecerCredenciales({
      username: this.username.trim(),
      pin: this.pinAdministrador,
      password: this.password,
    }).subscribe({
      next: (respuesta) => {
        this.loading = false;
        this.mostrarModalPin = false;
        this.cdr.detectChanges();
        this.router.navigate(['/usuarios']).then(() => {
          this.popUps.exito(this.obtenerNombreBienvenida(respuesta), 'Bienvenido al sistema', 3000);
        });
      },
      error: (error) => {
        this.loading = false;
        const mensaje = error?.error?.message || 'El PIN no es válido.';
        this.registrarIntentoFallido(mensaje);
        this.cdr.detectChanges();
      },
    });
  }

  private registrarIntentoFallido(mensaje: string): void {
    this.intentosPin++;
    if (this.intentosPin >= 3) {
      this.mensajePin = 'Se alcanzó el límite de intentos. Comunícate con el administrador para restablecer el PIN.';
      return;
    }

    this.mensajePin = `${mensaje} Intentos restantes: ${3 - this.intentosPin}.`;
    this.cdr.detectChanges();
  }

  private obtenerNombreBienvenida(respuesta: {
    nombreCompleto?: string;
    nombres?: string;
    apellidos?: string;
    persona?: { nombres?: string; apellidos?: string };
  }): string {
    const nombres = respuesta.nombres || respuesta.persona?.nombres || '';
    const apellidos = respuesta.apellidos || respuesta.persona?.apellidos || '';
    return `${nombres} ${apellidos}`.trim() || respuesta.nombreCompleto?.trim() || this.username.trim();
  }

  onSubmit(): void {
    if (this.showCredentialRecovery) {
      this.solicitarCambioCredenciales();
      return;
    }

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      username: this.username.trim(),
      password: this.password,
    }).subscribe({
      next: (respuesta) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/usuarios']).then(() => {
          this.popUps.exito(this.obtenerNombreBienvenida(respuesta), 'Bienvenido al sistema', 3000);
        });
      },
      error: (err) => {
        this.loading = false;
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err?.status === 401 || err?.status === 400) {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        } else if (err?.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor';
        } else {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        }
        this.cdr.detectChanges();
      },
    });
  }
}
