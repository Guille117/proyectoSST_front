import { Injectable, signal, Type } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  
  // ------  Servicio para controlar el contenido y datos del modal
  
  // Almacena qué componente debe mostrarse dentro del modal
  componenteActivo = signal<Type<any> | null>(null);

  // Almacena los datos que se pasan al componente del modal
  datosInput = signal<any>(null);

  // Almacena si el modal está abierto o cerrado
  isOpen = signal<boolean>(false);

  // Método para abrir el modal con un componente específico y opcionalmente pasarle datos
  open(componente: Type<any>, datos?: any): void {
    this.datosInput.set(datos);
    this.componenteActivo.set(componente);
    
    // Pequeño delay opcional para la animación de entrada
    requestAnimationFrame(() => {
      this.isOpen.set(true);
    });
  }

  // Método para cerrar el modal
  close(): void {
    this.isOpen.set(false);
    // Esperamos antes de destruir el componente del DOM
    setTimeout(() => {
      this.componenteActivo.set(null);
      this.datosInput.set(null);
    }, 500);
  }
}
