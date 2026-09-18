import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { ModalAction } from '../../../../modal-principal/modal-service';

interface ProductForm {
  productType: 'medication' | 'input';
  genericName: string;
  dose: string;
  commercialBrand: string;
  administrationRoute: string;
  presentation: string;
}

@Component({
  selector: 'app-modal-mas-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, TabSwitch],
  templateUrl: './modal-mas-detalle.html',
  styleUrl: './modal-mas-detalle.scss',
})
export class ModalMasDetalle implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<ProductForm>();
  @Output() titulo = new EventEmitter<string>();
  @Output() subTitulo = new EventEmitter<string>();

  productForm: ProductForm = {
    productType: 'medication',
    genericName: '',
    dose: '',
    commercialBrand: '',
    administrationRoute: '',
    presentation: ''
  };

  administrationRoutes: string[] = ['Oral', 'Inyectable', 'Tópico', 'Inhalado'];
  presentations: string[] = ['Tableta', 'Cápsula', 'Inyección', 'Suspensión'];
  isMedicamento: boolean = true;

  get modalActions(): ModalAction[] {
    return [
      { id: 'cancelar', label: 'Cancelar', className: '_cancelar', onClick: () => this.cancel() },
      { id: 'guardar', label: 'Guardar', className: '_guardar', onClick: () => this.save() },
    ];
  }

  constructor() {}

  ngOnInit(): void {}

  cancel(): void {
    this.onCancel.emit();
  }

  save(): void {
    if (this.isFormValid()) {
      this.onSave.emit(this.productForm);
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.productForm.genericName &&
      this.productForm.dose &&
      this.productForm.commercialBrand &&
      this.productForm.administrationRoute &&
      this.productForm.presentation
    );
  }
}
