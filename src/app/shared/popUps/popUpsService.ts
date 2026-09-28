import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PopUps {

  private Toast = Swal.mixin({
    toast: true,
    position: 'top', // <-- Cambiado a 'top' para centrarlo arriba
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: false,
    customClass: {
      popup: 'custom-toast-glass',
      title: 'custom-toast-title',
      htmlContainer: 'custom-toast-text',
      icon: 'custom-toast-icon'
    }
  });

  exito(mensaje: string, titulo = '¡Éxito!', duracion = 3000) {
    this.Toast.fire({
      icon: 'success',
      title: titulo,
      text: mensaje,
      timer: duracion,
    });
  }

  error(mensaje: string) {
    this.Toast.fire({
      icon: 'error',
      title: 'Error',
      text: mensaje,
    });
  }

  advertencia(mensaje: string) {
    this.Toast.fire({
      icon: 'question',
      title: 'Advertencia',
      text: mensaje,
    });
  }

  async confirmarToast(
    mensaje: string,
    titulo = '¿Confirmar acción?',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar'
  ): Promise<boolean> {
    const res = await Swal.fire({
      toast: true,
      position: 'top', // <-- Cambiado a 'top' también aquí
      icon: 'question',
      title: titulo,
      text: mensaje,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: textoCancelar,
      buttonsStyling: false,
      timer: undefined,
      customClass: {
        popup: 'custom-toast-glass custom-toast-actions',
        title: 'custom-toast-title',
        htmlContainer: 'custom-toast-text',
        icon: 'custom-toast-icon',
        actions: 'custom-toast-actions-container',
        confirmButton: 'custom-toast-btn-confirm',
        cancelButton: 'custom-toast-btn-cancel'
      }
    });

    return res.isConfirmed;
  }

  async solicitarContrasena(): Promise<string | null> {
    const resultado = await Swal.fire({
      title: '<span class="custom-password-lock"><i class="bi bi-lock-fill"></i></span><span>Confirmar<br>restablecimiento</span>',
      text: 'Ingrese su contraseña para validar esta acción',
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: 'Ingresa tu contraseña',
      inputAttributes: {
        autocomplete: 'new-password',
      },
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      width: 430,
      customClass: {
        popup: 'custom-toast-glass custom-password-popup',
        title: 'custom-password-title',
        htmlContainer: 'custom-password-text',
        input: 'custom-password-input',
        inputLabel: 'custom-password-label',
        actions: 'custom-password-actions',
        confirmButton: 'custom-toast-btn-confirm',
        cancelButton: 'custom-toast-btn-cancel',
      },
      inputValidator: (valor) => {
        if (!valor?.trim()) return 'Debe ingresar una contraseña';
        return undefined;
      },
    });

    return resultado.isConfirmed ? String(resultado.value).trim() : null;
  }

  formIncompleto(mensaje: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Formulario incompleto',
      text: mensaje,
    });
  }

  errorDesdeBackend(error: unknown, mensajeDefault = 'Ha ocurrido un error. Intente nuevamente.') {
    this.error(this.obtenerMensajeError(error, mensajeDefault));
  }

  private obtenerMensajeError(error: unknown, mensajeDefault: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (body && typeof body === 'object' && 'message' in body) {
        const message = String((body as { message?: unknown }).message ?? '').trim();
        if (message) {
          return message;
        }
      }

      if (typeof body === 'string') {
        const message = body.trim();
        if (message) {
          return message;
        }
      }

      if (error.status === 0) {
        return 'No se pudo conectar con el servidor.';
      }
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message?: unknown }).message ?? '').trim();
      if (message) {
        return message;
      }
    }

    return mensajeDefault;
  }
}