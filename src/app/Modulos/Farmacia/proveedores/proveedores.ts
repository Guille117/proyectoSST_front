import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.scss',
})
export class Proveedores {
  proveedor = {
    nombre: '',
    telefono: '',
    email: '',
    nit: '',
  };

  nitPattern = '^[0-9]{4,10}[0-9Kk]$';
}
