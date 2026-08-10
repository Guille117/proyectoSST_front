import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PurchaseLine {
  code: string;
  medicamento: string;
  presentacion: string;
  lote: string;
  vencimiento: string;
  precio: number;
  cantidad: number;
}

interface PurchaseForm {
  searchTerm: string;
  lote: string;
  vencimiento: string;
  precio: number | null;
  cantidad: number | null;
}

@Component({
  selector: 'app-modal-mas-compra',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-mas-compra.html',
  styleUrl: './modal-mas-compra.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalMasCompra implements OnInit {
  @Output() titulo = new EventEmitter<string>();
  @Output() subTitulo = new EventEmitter<string>();


  ngOnInit(): void {
    this.titulo.emit('Registro de compra');
    this.subTitulo.emit('Paso 1 de 2: Selección de productos');
  }

























  onCancel = output<void>();
  onSave = output<PurchaseLine[]>();

  form: PurchaseForm = {
    searchTerm: '',
    lote: '',
    vencimiento: '',
    precio: null,
    cantidad: null,
  };

  editIndex: number | null = null;

  lineasCompra: PurchaseLine[] = [
    {
      code: 'MED-001',
      medicamento: 'Amoxicilina MK',
      presentacion: 'Tableta de 500mg',
      lote: 'L-450X',
      vencimiento: '12/2028',
      precio: 85,
      cantidad: 10,
    },
    {
      code: 'MED-002',
      medicamento: 'Paracetamol Genfar',
      presentacion: 'Jarabe de 250mg/5ml',
      lote: 'L-112B',
      vencimiento: '05/2027',
      precio: 42,
      cantidad: 5,
    },
    {
      code: 'MED-003',
      medicamento: 'Ibuprofeno Pfizer',
      presentacion: 'Capsula blanda de 400mg',
      lote: 'P-789A',
      vencimiento: '10/2026',
      precio: 65,
      cantidad: 20,
    },
  ];

  addOrUpdateLinea(): void {
    if (!this.isFormValid()) {
      return;
    }

    const codigoBase = this.editIndex !== null
      ? this.lineasCompra[this.editIndex].code
      : `MED-${String(this.lineasCompra.length + 1).padStart(3, '0')}`;

    const medicamento = this.form.searchTerm.trim();
    const [nombre, presentacion] = this.splitMedicineAndPresentation(medicamento);

    const nuevaLinea: PurchaseLine = {
      code: codigoBase,
      medicamento: nombre,
      presentacion,
      lote: this.form.lote.trim(),
      vencimiento: this.formatExpiry(this.form.vencimiento),
      precio: Number(this.form.precio),
      cantidad: Number(this.form.cantidad),
    };

    if (this.editIndex !== null) {
      this.lineasCompra[this.editIndex] = nuevaLinea;
      this.editIndex = null;
    } else {
      this.lineasCompra = [...this.lineasCompra, nuevaLinea];
    }

    this.resetForm();
  }

  editLinea(index: number): void {
    const linea = this.lineasCompra[index];
    this.editIndex = index;

    this.form = {
      searchTerm: `${linea.medicamento} ${linea.presentacion}`.trim(),
      lote: linea.lote,
      vencimiento: this.toIsoDate(linea.vencimiento),
      precio: linea.precio,
      cantidad: linea.cantidad,
    };
  }

  removeLinea(index: number): void {
    this.lineasCompra = this.lineasCompra.filter((_, i) => i !== index);
    if (this.editIndex === index) {
      this.resetForm();
      this.editIndex = null;
    }
  }

  getSubtotal(linea: PurchaseLine): number {
    return linea.precio * linea.cantidad;
  }

  cancel(): void {
    this.onCancel.emit();
  }

  save(): void {
    if (!this.lineasCompra.length) {
      return;
    }
    this.onSave.emit(this.lineasCompra);
  }

  trackByCode(_index: number, linea: PurchaseLine): string {
    return linea.code;
  }

  private isFormValid(): boolean {
    return Boolean(
      this.form.searchTerm.trim() &&
        this.form.lote.trim() &&
        this.form.vencimiento &&
        this.form.precio &&
        this.form.precio > 0 &&
        this.form.cantidad &&
        this.form.cantidad > 0
    );
  }

  private resetForm(): void {
    this.form = {
      searchTerm: '',
      lote: '',
      vencimiento: '',
      precio: null,
      cantidad: null,
    };
  }

  private splitMedicineAndPresentation(raw: string): [string, string] {
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const tokens = normalized.split(' ');

    if (tokens.length <= 2) {
      return [normalized, 'Sin presentacion'];
    }

    const splitIndex = Math.max(1, Math.floor(tokens.length * 0.6));
    return [
      tokens.slice(0, splitIndex).join(' '),
      tokens.slice(splitIndex).join(' '),
    ];
  }

  private formatExpiry(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${month}/${date.getFullYear()}`;
  }

  private toIsoDate(value: string): string {
    const [month, year] = value.split('/');
    if (!month || !year) {
      return '';
    }
    return `${year}-${month.padStart(2, '0')}-01`;
  }
}
