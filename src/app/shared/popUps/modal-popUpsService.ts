import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class ModalPopUps {
  exito(mensaje: string, titulo = '¡Éxito!', duracion = 3000): void {
    this.crearToast().fire({ icon: 'success', title: titulo, text: mensaje, timer: duracion });
  }

  async usuarioCreado(pin: string | number | null | undefined): Promise<void> {
    const detallePin = pin === undefined || pin === null
      ? 'No se recibió el PIN del primer ingreso.'
      : `PIN generado: ${pin}`;

    await Swal.fire({
      target: this.obtenerHost(),
      icon: 'success',
      title: 'Usuario creado exitosamente',
      text: detallePin,
      toast: false,
      position: 'center',
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      returnFocus: false,
      didOpen: (popup) => {
        const closeButton = popup.querySelector<HTMLButtonElement>('.modal-toast-btn-confirm');
        closeButton?.addEventListener('click', () => Swal.close(), { capture: true, once: true });
      },
      customClass: {
        popup: 'modal-toast modal-success-popup',
        confirmButton: 'modal-toast-btn-confirm',
      },
    });
  }

  error(mensaje: string): void {
    this.crearToast().fire({ icon: 'error', title: 'Error', text: mensaje });
  }

  advertencia(mensaje: string): void {
    this.crearToast().fire({ icon: 'question', title: 'Advertencia', text: mensaje });
  }

  async confirmarToast(
    mensaje: string,
    titulo = '¿Confirmar acción?',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
  ): Promise<boolean> {
    const resultado = await Swal.fire({
      target: this.obtenerHost(),
      toast: true,
      position: 'top',
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
        popup: 'modal-toast',
        confirmButton: 'modal-toast-btn-confirm',
        cancelButton: 'modal-toast-btn-cancel',
      },
    });

    return resultado.isConfirmed;
  }

  formIncompleto(mensaje: string): void {
    this.crearToast().fire({ icon: 'warning', title: 'Formulario incompleto', text: mensaje });
  }

  errorDesdeBackend(error: unknown, mensajeDefault = 'Ha ocurrido un error. Intente nuevamente.'): void {
    this.error(this.obtenerMensajeError(error, mensajeDefault));
  }

  private crearToast() {
    return Swal.mixin({
      target: this.obtenerHost(),
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: false,
      customClass: { popup: 'modal-toast' },
    });
  }

  private obtenerHost(): HTMLElement {
    const host = document.querySelector<HTMLElement>('.modal-popup-host');
    if (!host) {
      throw new Error('No se encontró el contenedor de popups del modal.');
    }
    return host;
  }

  private obtenerMensajeError(error: unknown, mensajeDefault: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body) {
        const mensaje = String((body as { message?: unknown }).message ?? '').trim();
        if (mensaje) return mensaje;
      }
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const mensaje = String((error as { message?: unknown }).message ?? '').trim();
      if (mensaje) return mensaje;
    }

    return mensajeDefault;
  }
}