import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface OpcionOtroValor {
  nombre: string;
  abreviatura?: string;
}

@Component({
  selector: 'app-opcion-otro',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './opcion-otro.html',
  styleUrl: './opcion-otro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpcionOtroComponent {
  readonly placeholder = input('Escribe la opción');
  readonly requiereAbreviatura = input(false);
  readonly creando = input(false);

  readonly confirmar = output<OpcionOtroValor>();
  readonly cancelar = output<void>();

  nombre = '';
  abreviatura = '';

  get completo(): boolean {
    const nombre = this.nombre.trim();
    const abreviatura = this.abreviatura.trim();

    return !!nombre && (!this.requiereAbreviatura() || !!abreviatura);
  }

  confirmarOpcion(evento?: Event): void {
    evento?.preventDefault();

    if (!this.completo || this.creando()) {
      return;
    }

    this.confirmar.emit({
      nombre: this.nombre.trim(),
      abreviatura: this.requiereAbreviatura() ? this.abreviatura.trim() : undefined,
    });
  }

  cancelarOpcion(): void {
    if (this.creando()) {
      return;
    }

    this.cancelar.emit();
  }
}
