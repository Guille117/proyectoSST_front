import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { proveedorRequest, proveedorResponse } from './data/proveedorInterfaz';
import { ProveedorService } from './data/proveedor-service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.scss',
})
export class Proveedores {
  constructor(
    private proveedorService: ProveedorService,
    private cdr: ChangeDetectorRef
  ) {}

  proveedor: proveedorRequest = {
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
  }
  
  proveedores: proveedorResponse[] = [];

  ngOnInit() {
    this.cargarProveedores();
  }

  cargarProveedores() {
    this.proveedorService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar los proveedores:', error);
      },
    });
    console.log('Proveedores cargados:', this.proveedores);
  }
  
  a:any;

  nitPattern = '^[0-9]{4,10}[0-9Kk]$';
}