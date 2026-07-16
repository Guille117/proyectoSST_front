import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-mas-detalle.html',
  styleUrl: './modal-mas-detalle.scss',
})
export class ModalMasDetalle implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<ProductForm>();
  @Output() titulo = new EventEmitter<string>();

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
  constructor() {}

  ngOnInit(): void {
    this.titulo.emit('Detalle del Medicamento');
  }

  changeProductType(): void {
    this.isMedicamento = !this.isMedicamento;
  }

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
