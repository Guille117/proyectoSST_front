import { Component, ElementRef, Input, Type, ViewChild, ViewContainerRef, effect, inject, output } from '@angular/core';
import { ModalContent, ModalService } from './modal-service';

@Component({
  selector: 'app-modal-principal',
  imports: [],
  templateUrl: './modal-principal.html',
  styleUrl: './modal-principal.scss',
})
export class ModalPrincipal {
  componentInstance: ModalContent | null = null;
  private isClosing = false;
  private renderedComponent: Type<unknown> | null = null;
  private renderedData: unknown = null;
  // varibles
  @Input() title: string = '';
  @Input() subtitle: string = '';
  
  // Referencia al elemento <dialog> del HTML
  @ViewChild('dialogElement') private dialog! : ElementRef<HTMLDialogElement>;
  
  // Referencia al contenedor donde se renderizará el componente dinámico
  @ViewChild('componentContainer', { read: ViewContainerRef }) private componentContainer! : ViewContainerRef;
  
  // se inyecta el servicio global
  private modalService = inject(ModalService);

  // Evento que se dispara cuando el modal se cierra (por botón o tecla ESC)
  onClose = output<void>();

  constructor() {
    // Se crea un efecto que se ejecuta cada vez que cambia el componente activo o el estado en el servicio
    effect(() =>{
      // Obtiene el componente y el estado
      const componente = this.modalService.componenteActivo();
      const deberiaEstarAbierto = this.modalService.isOpen();
      const datos = this.modalService.datosInput();

      queueMicrotask(() => {
        if (datos && datos.title){
          this.title = datos.title;
        }else if(!componente){
          this.title = '';
        }

        if (datos && datos.subtitle){
          this.subtitle = datos.subtitle;
        }else if(!componente){
          this.subtitle = '';
        }
      });

      // Si hay un componente, lo renderiza dinámicamente
      const debeCrearComponente = componente && this.componentContainer && (
        this.renderedComponent !== componente || this.renderedData !== datos
      );

      if(debeCrearComponente) {
        this.componentContainer.clear();
        const componentRef = this.componentContainer.createComponent(componente);
        this.componentInstance = componentRef.instance as ModalContent;
        this.renderedComponent = componente;
        this.renderedData = datos;

        if (datos) {
          Object.entries(datos).forEach(([key, value]) => {
            if (key in componentRef.instance && key !== 'title') {
              componentRef.setInput(key, value);
            }
          });
        }
      } else if (!componente) {
        this.componentInstance = null;
        this.renderedComponent = null;
        this.renderedData = null;
      }

      if(deberiaEstarAbierto && this.dialog){
        this.open();
      } 
      else if(!deberiaEstarAbierto && this.dialog && this.dialog.nativeElement.open){
        this.close();
      }
    })
  }


  // Método público para abrir modal
  public open(): void {
    const dialog = this.dialog.nativeElement;
    this.isClosing = false;
    dialog.classList.remove('closing');
    dialog.classList.remove('open');
    
    // Evitamos abrirlo si ya está abierto de forma nativa
    if (!dialog.open) {
      dialog.showModal();
    }

    requestAnimationFrame(() => {
      dialog.classList.add('open');
    });
  }


  
  closeComponente(): void {
    // Si el usuario cierra el modal, le avisamos al servicio que cierre todo
    this.modalService.close();
  }


  // Método público para cerrar
  public close(): void {
    const dialog = this.dialog.nativeElement;
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;
    dialog.classList.remove('open');
    dialog.classList.add('closing');

    window.setTimeout(() => {
      if (dialog.open) {
        dialog.close();
      }
      dialog.classList.remove('closing');
    }, 500);
  }

  // Se ejecuta automáticamente cuando el <dialog> emite su evento 'close' nativo (ESC, etc)
  handleNativeClose(): void {
    this.modalService.close();
    this.onClose.emit();
  }

}
