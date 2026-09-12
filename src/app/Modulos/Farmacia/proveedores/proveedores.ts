import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { proveedorRequest, proveedorResponse } from './data/proveedorInterfaz';
import { ProveedorService } from './data/proveedor-service';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { ModalPrincipal } from '../../../modal-principal/modal-principal';
import { ModalService } from '../../../modal-principal/modal-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from "../../../shared/tab-switch/tab-switch";

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [FormsModule, NgClass, CampoValidado, ModalPrincipal, TabSwitch],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.scss',
})
export class Proveedores {
resultadoSwitch($event: boolean) {
throw new Error('Method not implemented.');
}
  private modalService = inject(ModalService);
  
  constructor(
    private proveedorService: ProveedorService,
    private cdr: ChangeDetectorRef,
    private popUps: PopUps
  ) {}
  
  // ------------------    VARIABLES ------------------------------
  
  proveedor: proveedorRequest = {
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
  }
  
  proveedores: proveedorResponse[] = [];
  nombreProveedor: string = ''; // variable para busqueda por nombre
  isEditing: boolean = false; // variable para determinar si se está editando un proveedor
  idProveedorActualizar: number | null = null; // variable para almacenar el ID del proveedor a actualizar
  proveedorOriginalClave = '';
  mostrarActivos: boolean = true; // variable para determinar si se muestran proveedores activos o inactivos
  


  // --------------------------------------------------------------------------------
  ngOnInit() {
    this.cargarProveedores(true);
  }

  cargarProveedores(activos:boolean) {
    this.mostrarActivos = activos;
    this.proveedorService.getProveedores(activos).subscribe({
      next: (data) => {
        this.proveedores = data;
        this.cdr.detectChanges();
      }
    });
  }

  async guardarCambios() {
  const aceptado = await this.popUps.confirmarToast(
    '¿Deseas guardar los cambios realizados?',
    'Confirmación'
  );

  if (aceptado) {
    this.popUps.exito('Cambios guardados con éxito.');
  }
}


   

  guardarProveedor() {
    // this.proveedorService.postProveedor(this.proveedor).subscribe({
    //   next: () => {
    //     this.popUps.exito('Proveedor guardado exitosamente.');
    //     this.resetarVariable();
    //     this.cargarProveedores(true);
       
    //   },
    //   error: (error) => {
    //     this.popUps.errorDesdeBackend(error, 'No se pudo guardar el proveedor. Intente nuevamente.');
    //   },
    // });
    this.popUps.advertencia('Funcionalidad deshabilitada temporalmente.');
    // this.popUps.exito('Funcionalidad deshabilitada temporalmente.');
  }

  buscarProveedorPorNombre(activos:boolean) {
    if(this.nombreProveedor != '') {
      this.proveedorService.getProveedorByNombre(this.nombreProveedor, activos).subscribe({
        next: (data) => {
          this.proveedores = data;
          this.cdr.detectChanges();
        }
      })
    }else{
      this.cargarProveedores(activos);
    }
  }

  preActualizarProveedor(prov: proveedorResponse) {
    this.proveedor = prov;
    this.proveedorOriginalClave = this.obtenerClaveProveedor(prov);
    this.isEditing = true;
    this.idProveedorActualizar = prov.id;
  }

  async editarProveedor() {
    const confirmado = await this.popUps.confirmarToast(
      '¿Deseas guardar los cambios realizados?',
      'Confirmación'
    );
    if (!confirmado) {
      return;
    }

    this.proveedorService.putProveedor(this.idProveedorActualizar!, this.proveedor).subscribe({
      next:() => {
        this.popUps.exito('Proveedor actualizado exitosamente.');
        this.resetarVariable();
        this.cargarProveedores(true);
        this.isEditing = false;
        this.idProveedorActualizar = null;
        this.proveedorOriginalClave = '';
      },
      error: (error) => {
        this.popUps.errorDesdeBackend(error, 'No se pudo actualizar el proveedor. Intente nuevamente.');
      }
    });
  }


  cancelar(){
    this.resetarVariable();
    this.isEditing = false;
    this.idProveedorActualizar = null;
    this.proveedorOriginalClave = '';
  }

  async cambiarEstadoProveedor(id: number) {
    await this.popUps.confirmarToast(
      '¿Deseas cambiar el estado del proveedor?',
      'Confirmación'
    ).then((result) => { 
      this.proveedorService.cambiarEstado(id).subscribe({
        next: () => {
          this.popUps.exito('Estado del proveedor cambiado exitosamente.');
          this.cargarProveedores(this.mostrarActivos);
        },
        error: (error) => {
          this.popUps.errorDesdeBackend(error, 'No se pudo cambiar el estado del proveedor. Intente nuevamente.');
        }
      });
    });
  }

  nitPattern = '^[0-9]{7}-[0-9Kk]$';

  isFormValido(): boolean {
    const nombreValido = !!this.proveedor.nombre?.trim();
    const telefonoValido = !this.proveedor.telefono || /^[0-9]{8}$/.test(this.proveedor.telefono);
    const emailValido = !this.proveedor.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.proveedor.email);
    const nitValido = !this.proveedor.nit || new RegExp(this.nitPattern).test(this.proveedor.nit);

    return nombreValido && telefonoValido && emailValido && nitValido;
  }

  tieneCambiosValidosParaActualizar(): boolean {
    return this.isEditing && this.proveedorOriginalClave !== this.obtenerClaveProveedor(this.proveedor);
  }

  private obtenerClaveProveedor(prov: proveedorRequest): string {
    return [prov.nombre, prov.telefono, prov.email, prov.nit]
      .map((valor) => (valor ?? '').trim())
      .join('|');
  }

  resetarVariable(){
    this.proveedor = {
      nombre: '',
      nit: '',
      telefono: '',
      email: '',
    };
  }
}