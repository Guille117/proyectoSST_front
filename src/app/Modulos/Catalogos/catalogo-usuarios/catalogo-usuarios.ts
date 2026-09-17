import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../data/serviceCatalogo';
import { Nombre, NombreGet, registrosCatalogos } from '../data/nombreInterfaz';
import { Paginacion } from '../../../shared/paginacion/paginacion';

@Component({
  selector: 'app-catalogo-usuarios',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './catalogo-usuarios.html',
  styleUrl: '../catalogo-farmacia/catalogo-farmacia.scss',
})
export class CatalogoUsuarios implements OnInit {
  // servicios y configuración del catálogo
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
      key: 'UnidadMedida',
      url: 'puestos',
      icono: 'bi bi-briefcase',
      titulo: 'Puesto',
      descripcion: 'Indica los puestos posibles para usuarios',
      cantidad: 0
    },
  ];
   
  catalogoSeleccionado = '';
  catalogoUrl = '';

  // metodos

  ngOnInit(): void {
    this.seleccionarCatalogo(this.listaCatalogos[0].titulo, this.listaCatalogos[0].url);
    this.obtenerContedoCatalogos();
    this.obtenerContedoCatalogos();
    this.traerRegistros(true);
  }
  
  seleccionarCatalogo(nombre: string, url: string) {
    this.catalogoSeleccionado = nombre;
    this.catalogoUrl = url;
    this.traerRegistros(this.mostrarActivos);
  }

  // ---------------------------------------------------------------------------------
    // obtener la cantidad de registros en las tablas relacionadas con farmacia
  
    obtenerContedoCatalogos(){
      this.catalogoService.obtenerRegistrosCatalogosUsuarios().subscribe({
        next: (data) => {
          this.listaCatalogos[0].cantidad = data;
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
  registros: NombreGet[] = [];
  
  traerRegistros(estado:boolean){
    this.catalogoService.listar(this.catalogoUrl, estado).subscribe({
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
  nombreOriginal = '';
  idRegistroSeleccionado = 0;

  guardar(formulario: NgForm){
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

  forumularioVacio(){
    return this.nombre === '' && this.nombre === null;
  }

  // ---------------------------------------------------------------------------------

// editar registro
  editar: boolean = false;

  precargar(nombre: string, id: number){
    this.editar = true;
    this.nombre = nombre;
    this.nombreOriginal = nombre;
    this.idRegistroSeleccionado = id;
  }

  hayCambios(): boolean {
    return (this.nombre.trim() !== this.nombreOriginal.trim()) 
  }

  async editarRegistro(formulario: NgForm){
    if(this.editar){
      const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea editar el registro?');
      if(!confirmado) return;
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

    // ---------------------------------------------------------------------------------

// limpiar formulario
  limpiarFormulario(formulario: NgForm): void {
    this.editar = false;
    formulario.resetForm();
    this.nombre = '';
  }
}
 