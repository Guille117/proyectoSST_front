import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../data/serviceCatalogo';
import { Nombre, NombreGet, registrosCatalogos, tipoDato2 } from '../data/nombreInterfaz';
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
      key: 'UnidadMedida',
      url: 'unidadMedida',
      icono: 'bi bi-beaker',
      titulo: 'Unidad de medida',
      descripcion: 'Especifica la unidad de medida del medicamento',
      cantidad: 0
    },
    {
      key: 'Fabricante',
      url: 'marca',
      icono: 'bi bi-building',
      titulo: 'Fabricante',
      descripcion: 'Especifica el laboratorio fabricante del medicamento',
      cantidad: 5
    },
    {
      key: 'ViaAdministracion',
      url: 'viaAdmin',
      icono: 'bi bi-capsule',
      titulo: 'Vía de administración',
      descripcion: 'Especifica la vía de administración del medicamento',
      cantidad: 0
    },
    {
      key: 'Presentacion',
      url: 'presentacion',
      icono: 'bi bi-prescription2',
      titulo: 'Presentación',
      descripcion: 'Indica el formato físico del medicamento',
      cantidad: 0
    },
  ]

  catalogoSeleccionado = '';
  catalogoUrl = '';
  
  // métodos
  
  ngOnInit(): void {
    this.seleccionarCatalogo(this.listaCatalogos[0].titulo, this.listaCatalogos[0].url);
    this.obtenerContedoCatalogos();
    this.llenarConetoACatalogos();
    this.traerRegistros(true);
  }
  
  seleccionarCatalogo(nombre: string, url: string) {
    this.catalogoSeleccionado = nombre;
    this.catalogoUrl = url;
    this.traerRegistros(this.mostrarActivos);
  }

// ---------------------------------------------------------------------------------
  // obtener la cantidad de registros en las tablas relacionadas con farmacia

  listaRegistrosCatalogos: registrosCatalogos[] = []; 

  obtenerContedoCatalogos(){
    this.catalogoService.obtenerRegistrosCatalogosFarmacia().subscribe({
      next: (data) => {
        this.listaRegistrosCatalogos = data;
        this.llenarConetoACatalogos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUps.error('Error al obtener los registros de los catálogos de farmacia');
      }
    })
  }

// llenar la info a los catálogos 
llenarConetoACatalogos() {
  for (let catalogo of this.listaCatalogos) {
    catalogo.cantidad = this.listaRegistrosCatalogos.find(registro => registro.tabla === catalogo.key)?.total || 0;
  }
}
// ---------------------------------------------------------------------------------

// traer registros de catalodos
mostrarActivos:boolean = true;
registros: NombreGet[] = [];
unidadesMedida: tipoDato2[] = [];

traerRegistros(estado:boolean){
  if (this.catalogoSeleccionado === 'Unidad de medida') {
    this.catalogoService.listarUnidadMedida(estado).subscribe({
      next: (data) => {
        this.unidadesMedida = data;
        this.cdr.detectChanges();
      }
    })
  }else{
    this.catalogoService.listar(this.catalogoUrl, estado).subscribe({
      next: (data) => {
        this.registros = data;
        this.cdr.detectChanges();
      }
    });
  }
  this.mostrarActivos = estado;
}


// ---------------------------------------------------------------------------------

// actualizar estado de un registro
async activarDesactivar(id:number){
  const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea cambiar el estado de este registro?');

  if(confirmado){
    this.catalogoService.cambiarEstado(this.catalogoUrl, id).subscribe({
      next:()=>{
        this.traerRegistros(this.mostrarActivos);
        this.obtenerContedoCatalogos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUps.errorDesdeBackend('Error al cambiar el estado del registro');
      }
    })
  }
}

// ---------------------------------------------------------------------------------

// guardar estado
  tituloFormulario: string = 'Guardar registro';

  nombre: string = '';
  abreviatura: string = '';
  nombreOriginal = '';
  abreviaturaOriginal = '';
  idRegistroSeleccionado = 0;

  guardar(formulario: NgForm){
    // guardar unidad de medida
    if(this.catalogoSeleccionado === 'Unidad de medida') {
      if(!this.forumularioVacio()){
        this.catalogoService.guardarUnidadMedida(this.nombre, this.abreviatura).subscribe({
          next: () => {
            this.popUps.exito('Unidad de medida guardada con éxito');
            this.traerRegistros(this.mostrarActivos);
            this.obtenerContedoCatalogos();
            this.limpiarFormulario(formulario);
            this.cdr.detectChanges();
          },
          error: () => {
            this.popUps.errorDesdeBackend('Error al guardar la unidad de medida');
          }
        });
      }
      // guardar otro tipo de catálogo
    }else{
      if(!this.forumularioVacio()){
        this.catalogoService.crear(this.catalogoUrl, { nombre: this.nombre }).subscribe({
          next: () => {
            this.popUps.exito('Registro guardado con éxito');
            this.traerRegistros(this.mostrarActivos);
            this.obtenerContedoCatalogos();
            this.cdr.detectChanges();
            this.limpiarFormulario(formulario);
          },
          error: () => {
            this.popUps.errorDesdeBackend('Error al guardar el registro');
          }
        });
      }
    }
  }

  forumularioVacio(){
    if(this.catalogoSeleccionado === 'Unidad de medida'){
      return this.nombre === '' && this.nombre === null && this.abreviatura === '' && this.abreviatura === null;
    }else{
      return this.nombre === '' && this.nombre === null;
    }
  }

// ---------------------------------------------------------------------------------

// editar registro
  editar: boolean = false;

  precargar(nombre: string, id: number, abreviatura?: string){
    this.editar = true;
    this.nombre = nombre;
    this.nombreOriginal = nombre;
    this.idRegistroSeleccionado = id;
    this.abreviatura = abreviatura ?? '';
    this.abreviaturaOriginal = this.abreviatura;
  }

  hayCambios(): boolean {
    if (this.nombre.trim() !== this.nombreOriginal.trim()) {
      return true;
    }

    return this.catalogoSeleccionado === 'Unidad de medida'
      && this.abreviatura.trim() !== this.abreviaturaOriginal.trim();
  }

  async editarRegistro(formulario: NgForm){
    if(this.editar){
      const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea editar el registro?');
      if(!confirmado) return;
      if(this.catalogoSeleccionado === 'Unidad de medida') {
        if(!this.forumularioVacio()){
          this.catalogoService.actualizarUnidadMedida(
            this.idRegistroSeleccionado,
            this.nombre,
            this.abreviatura,
          ).subscribe({
            next: () => {
              this.popUps.exito('Unidad de medida actualizada con éxito');
              this.traerRegistros(this.mostrarActivos);
              this.obtenerContedoCatalogos();
              this.limpiarFormulario(formulario);
              this.cdr.detectChanges();
              this.editar = false;
            },
            error: () => {
              this.popUps.errorDesdeBackend('Error al actualizar la unidad de medida');
            }
          });
        }
      }else{
        if(!this.forumularioVacio()){
          this.catalogoService.actualizar(this.catalogoUrl, this.idRegistroSeleccionado, { nombre: this.nombre }).subscribe({
            next: () => {
              this.popUps.exito('Registro actualizado con éxito');
              this.traerRegistros(this.mostrarActivos);
              this.obtenerContedoCatalogos();
              this.limpiarFormulario(formulario);
              this.cdr.detectChanges();
              this.editar = false;
            },
            error: () => {
              this.popUps.errorDesdeBackend('Error al actualizar el registro');
            }
          });
        }
      }
    }
  }


  // ---------------------------------------------------------------------------------

// limpiar formulario
  limpiarFormulario(formulario: NgForm): void {
    this.editar = false;
    formulario.resetForm();
    this.nombre = '';
    this.abreviatura = '';
  }
}
  