import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PopUps {

  private posicionarToast(popup: HTMLElement): void {
    const container = popup.parentElement as HTMLElement | null;
    if (!container) return;

    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '2147483647';
    container.style.display = 'flex';
    container.style.alignItems = 'flex-start';
    container.style.justifyContent = 'flex-start';
    container.style.padding = '16px';
    container.style.boxSizing = 'border-box';
    container.style.pointerEvents = 'none';

    popup.style.position = 'absolute';
    popup.style.top = '16px';
    popup.style.left = 'calc(100% + 16px)';
    popup.style.right = 'auto';
    popup.style.margin = '0';
    popup.style.transform = 'none';
    popup.style.pointerEvents = 'auto';
  }

  private getTarget(): HTMLElement | string {
    const openDialog = document.querySelector('dialog[open]') as HTMLElement;
    return openDialog || 'body';
  }

  private Toast = Swal.mixin({
    toast: true,
    position: 'top',
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


exito(mensaje: string, titulo='¡Éxito!') {
  this.Toast.fire({
    icon: 'success',
    title: titulo,
    text: mensaje,
    target: this.getTarget(),
    didOpen: (popup) => this.posicionarToast(popup),
  });
}


error(mensaje: string) {
  this.Toast.fire({
    icon: 'error',
    title: 'Error',
    text: mensaje,
    target: this.getTarget(),
    didOpen: (popup) => this.posicionarToast(popup),
  });
}


advertencia(mensaje: string) {
  this.Toast.fire({
    icon: 'question',
    title: 'Advertencia',
    text: mensaje,
    target: this.getTarget(),
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
      position: 'top',
      icon: 'question',
      title: titulo,
      text: mensaje,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: textoCancelar,
      buttonsStyling: false, // Para usar estilos CSS propios
      timer: undefined,      // Sin timer para que espere al usuario
      target: this.getTarget(),
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







  formIncompleto(mensaje: string){
    Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: mensaje,
        target: this.getTarget(),
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