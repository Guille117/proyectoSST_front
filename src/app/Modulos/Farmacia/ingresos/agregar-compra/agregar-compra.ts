import { Component, output } from '@angular/core';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../../shared/paginacion/paginacion';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-agregar-compra',
  imports: [TabSwitch, Paginacion, CampoValidado, FormsModule],
  templateUrl: './agregar-compra.html',
  styleUrl: './agregar-compra.scss',
})
export class AgregarCompra {
  cancelar = output<void>();

  isMedicamento: boolean = true;
  isCargandoProducto: boolean = true;

  // ------------ ESTADO REGISTRAR COMPRA ------------
  proveedorSeleccionadoId: number | null = null;
  archivoComprobante: File | null = null;


  // ----------------- GUARDAR ------------------------

    guardarCompra(formulario: NgForm): void {
      if (formulario.invalid) return;
      formulario.resetForm({ proveedor: null });
      this.proveedorSeleccionadoId = null;
      this.archivoComprobante = null;
    }
  // ----------------- HELPERS PARA ARCHIVOS --------------------
  seleccionarComprobante(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoComprobante = input.files?.[0] ?? null;
  }

  soltarComprobante(event: DragEvent): void {
    event.preventDefault();
    this.archivoComprobante = event.dataTransfer?.files[0] ?? null;
  }

  quitarComprobante(input: HTMLInputElement): void {
    this.archivoComprobante = null;
    input.value = '';
  }

  
}
