import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../data/serviceCatalogo';
import { Nombre, NombreGet } from '../data/nombreInterfaz';
import { Paginacion } from '../../../shared/paginacion/paginacion';

interface CatalogoGrupo {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-catalogo-farmacia',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './catalogo-farmacia.html',
  styleUrl: './catalogo-farmacia.scss',
})
export class CatalogoFarmacia implements OnInit {
  constructor(
    catalogoService: CatalogoService<Nombre, NombreGet>,
    private cdr: ChangeDetectorRef,
    private popUps: PopUps,
  ) {
    this.catalogoService = catalogoService;
  }
  private readonly catalogoService: CatalogoService<Nombre, NombreGet>;
  
  
  // variables
  // catálogo de grupos
  listaCatalogos = [
    {
      icono: 'bi bi-beaker',
      titulo: 'Unidad de medida',
      descripcion: 'Especifica la unidad de medida del medicamento',
      cantidad: 5
    },
    {
      icono: 'bi bi-building',
      titulo: 'Fabricante',
      descripcion: 'Especifica el laboratorio fabricante del medicamento',
      cantidad: 5
    },
    {
      icono: 'bi bi-capsule',
      titulo: 'Vía de administración',
      descripcion: 'Especifica la vía de administración del medicamento',
      cantidad: 5
    },
    {
      icono: 'bi bi-prescription2',
      titulo: 'Presentación',
      descripcion: 'Indica el formato físico del medicamento',
      cantidad: 5
    },
  ]

  catalogoSeleccionado = '';
  
  seleccionarCatalogo(nombre: string) {
    this.catalogoSeleccionado = nombre;
  }


ngOnInit(): void {
    this.catalogoSeleccionado = this.listaCatalogos[0].titulo;
  }








}
