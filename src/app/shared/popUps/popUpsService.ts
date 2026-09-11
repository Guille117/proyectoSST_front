import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PopUps {

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
  });
}


error(mensaje: string) {
  this.Toast.fire({
    icon: 'error',
    title: 'Error',
    text: mensaje,
    target: this.getTarget(),
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

confirmacionActualizar(): Promise<boolean> {
  return Swal.fire({
    icon: 'question',
    title: '<span style="font-weight:600; color:#111827;">¿Desea continuar?</span>',
    html: `
      <p style="font-size:14px; color:#374151; margin-top:8px;">
        La actualización se aplicará a todos los registros vinculados.
      </p>
    `,
    background: '#ffffff',
    width: '25rem',
    padding: '1.5rem 1.5rem 1rem',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'No',
    reverseButtons: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    focusCancel: true,
    buttonsStyling: false,
    target: this.getTarget(),
    customClass: {
      popup: 'rounded-4 shadow-sm border-0',
      actions: 'swal-actions-custom',
      confirmButton: 'swal-btn-confirm', 
      cancelButton: 'swal-btn-cancel'
    },
    position: 'top', // centrado en pantalla
  }).then((res) => !!res.isConfirmed);
}

confirmacionEliminar(): Promise<boolean> {
  return Swal.fire({
    icon: 'question',
    title: '<span style="font-weight:600; color:#111827;">¿Desea continuar?</span>',
    html: `
      <p style="font-size:14px; color:#374151; margin-top:8px;">
        La desactivación afectará a todos los registros vinculados y dejarán de estar disponibles en el sistema.
      </p>
    `,
    background: '#ffffff',
    width: '25rem',
    padding: '1.5rem 1.5rem 1rem',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'No',
    reverseButtons: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    focusCancel: true,
    buttonsStyling: false,
    target: this.getTarget(),
    customClass: {
      popup: 'rounded-4 shadow-sm border-0',
      actions: 'swal-actions-custom',
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    },
    position: 'top', // centrado en pantalla
  }).then((res) => !!res.isConfirmed);
}
}