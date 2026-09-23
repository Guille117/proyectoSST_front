import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgForm } from '@angular/forms';
import { Nombre, NombreGet, tipoDato2, tipoDato2Post } from '../data/nombreInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { CatalogoService } from '../data/serviceCatalogo';

@Component({
  selector: 'app-catalogo-paciente',
  imports: [CommonModule, FormsModule,TabSwitch, Paginacion],
  templateUrl: './catalogo-paciente.html',
  styleUrl: '../catalogo-farmacia/catalogo-farmacia.scss',
})
export class CatalogoPaciente {// servicios y configuración del catálogo
  private readonly catalogoService: CatalogoService<Nombre, NombreGet>;

   constructor(
    catalogoService: CatalogoService<Nombre, NombreGet>,
    private readonly cdr: ChangeDetectorRef,
    private readonly popUps: PopUps,
  ) {
    this.catalogoService = catalogoService;
  }

  // variables
  // catálogo de usuarios
  listaCatalogos = [
    {
      key: 'tipos_cama',
      url: 'tiposCama',
      icono: 'bi bi-tag',
      titulo: 'Tipo cama',
      descripcion: 'Indica los tipos de cama posibles',
      cantidad: 0
    },
    {
      key: 'areas',
      url: 'areas',
      icono: 'bi bi-collection',
      titulo: 'Area',
      descripcion: 'Indica las areas posibles de hospitalización',
      cantidad: 0
    },
    {
      key: 'habitaciones',
      url: 'habitaciones',
      icono: 'bi bi-grid',
      titulo: 'Habitación',
      descripcion: 'Indica las habitaciones para hospitalización',
      cantidad: 0
    },
  ];
   
  catalogoSeleccionado = '';
  catalogoUrl = '';

  // metodos

  ngOnInit(): void {
    this.seleccionarCatalogo(this.listaCatalogos[0].titulo, this.listaCatalogos[0].url);
    this.obtenerContedoCatalogos();
  }
  
  seleccionarCatalogo(nombre: string, url: string) {
    this.catalogoSeleccionado = nombre;
    this.catalogoUrl = url;
    this.traerRegistros(this.mostrarActivos);
  }

  // ---------------------------------------------------------------------------------
    // obtener la cantidad de registros en las tablas relacionadas con farmacia
  
    obtenerContedoCatalogos(){
      this.catalogoService.obtenerRegistrosCatalogosPacientes().subscribe({
        next: (data) => {
          for (const catalogo of this.listaCatalogos) {
            catalogo.cantidad = data.find((registro) => registro.tabla === catalogo.key)?.total ?? 0;
          }
          this.cdr.detectChanges(); 
        },
        error: () => {
          this.popUps.error('Error al obtener los registros de los catálogos de usuario');
        }
      })
    }

 
  // ---------------------------------------------------------------------------------
  
  // traer registros de catalodos
  mostrarActivos:boolean = true;
  registros: tipoDato2[] = [];
  
  traerRegistros(estado:boolean){
    this.catalogoService.listar2(this.catalogoUrl, estado).subscribe({
      next: (data) => {
        this.registros = data;
        this.cdr.detectChanges();
      }
    });
    this.mostrarActivos = estado;
  }

  // ---------------------------------------------------------------------------------

// actualizar estado de un registro
  async activarDesactivar(id:number){
    const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea cambiar el estado de este registro?');

    if(confirmado){
      this.catalogoService.cambiarEstado2(this.catalogoUrl, id).subscribe({
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
  descripcion: string = '';
  nombreOriginal = '';
  descripcionOriginal = '';
  idRegistroSeleccionado = 0;

  guardar(formulario: NgForm){
    if(!this.forumularioVacio()){
      const catalogo: tipoDato2Post = {
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim(),
      };

      this.catalogoService.crear2(this.catalogoUrl, catalogo).subscribe({
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

  forumularioVacio(){
    return this.nombre === '' && this.nombre === null;
  }

  // ---------------------------------------------------------------------------------

// editar registro
  editar: boolean = false;

  precargar(nombre: string, descripcion: string, id: number){
    this.editar = true;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.nombreOriginal = nombre;
    this.descripcionOriginal = descripcion;
    this.idRegistroSeleccionado = id;
  }

  hayCambios(): boolean {
    return this.nombre.trim() !== this.nombreOriginal.trim()
      || this.descripcion.trim() !== this.descripcionOriginal.trim();
  }

  async editarRegistro(formulario: NgForm){
    if(this.editar){
      const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea editar el registro?');
      if(!confirmado) return;
        if(!this.forumularioVacio()){
          const catalogo: tipoDato2Post = {
            nombre: this.nombre.trim(),
            descripcion: this.descripcion.trim(),
          };

          this.catalogoService.actualizar2(this.catalogoUrl, this.idRegistroSeleccionado, catalogo).subscribe({
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

    // ---------------------------------------------------------------------------------

// limpiar formulario
  limpiarFormulario(formulario: NgForm): void {
    this.editar = false;
    formulario.resetForm();
    this.nombre = '';
    this.descripcion = '';
  }
}
