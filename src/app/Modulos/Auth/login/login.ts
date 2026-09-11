import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../data/auth-service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

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
    if (!this.username.trim() || !this.password || this.password !== this.confirmPassword) {
      this.errorMessage = 'Completa el usuario y confirma que las contraseñas coincidan';
      return;
    }

    this.errorMessage = '';
    this.intentosPin = 0;
    this.pinAdministrador = '';
    this.mensajePin = '';
    this.mostrarModalPin = true;
  }

  validarPin(): void {
    if (this.pinAdministrador.length !== 6 || !/^\d{6}$/.test(this.pinAdministrador)) {
      this.intentosPin++;
      this.mensajePin = `El PIN debe tener 6 dígitos. Intentos restantes: ${3 - this.intentosPin}`;
      if (this.intentosPin >= 3) {
        this.mensajePin = 'Se alcanzó el límite de intentos. Comunícate con el administrador.';
      }
      return;
    }

    this.mensajePin = 'El PIN tiene un formato válido y está listo para validarse con el administrador.';
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
      next: () => {
        this.loading = false;
        this.router.navigate(['/usuarios']);
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
      },
    });
  }
}
