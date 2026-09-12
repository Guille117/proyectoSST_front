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

  exito(mensaje: string, titulo = '¡Éxito!') {
    this.Toast.fire({
      icon: 'success',
      title: titulo,
      text: mensaje,
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