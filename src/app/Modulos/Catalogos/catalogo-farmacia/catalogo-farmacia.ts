import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../data/serviceCatalogo';
import { Inter_base, Inter_descripcion, Inter_unidadMedida, registrosCatalogos } from '../data/nombreInterfaz';
import { Paginacion } from '../../../shared/paginacion/paginacion';

// Registro genérico de los catálogos de farmacia (unidad de medida, fabricante, vía, presentación, motivo baja)
type RegistroFarmacia = Inter_unidadMedida & Partial<Inter_descripcion>;

@Component({
  selector: 'app-catalogo-farmacia',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './catalogo-farmacia.html',
  styleUrl: './catalogo-farmacia.scss',
})
export class CatalogoFarmacia implements OnInit, OnDestroy {
  private peticionRegistros?: Subscription;
  private peticionConteos?: Subscription;
  private versionCatalogo = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private popUps: PopUps,
    private servicioCatalogo: CatalogoService,
  ) {
  }

  // variables
  // catálogo de grupos
  listaCatalogos = [
    {
      key: 'unidad_medidas',
      url: 'unidadMedida',
      icono: 'bi bi-beaker',
      titulo: 'Unidad de medida',
      descripcion: 'Especifica la unidad de medida del medicamento',
      cantidad: 0
    },
    {
      key: 'marcas',
      url: 'marca',
      icono: 'bi bi-building',
      titulo: 'Fabricante',
      descripcion: 'Especifica el laboratorio fabricante del medicamento',
      cantidad: 0
    },
    {
      key: 'vias_admin',
      url: 'viaAdmin',
      icono: 'bi bi-capsule',
      titulo: 'Vía de administración',
      descripcion: 'Especifica la vía de administración del medicamento',
      cantidad: 0
    },
    {
      key: 'presentaciones',
      url: 'presentacion',
      icono: 'bi bi-prescription2',
      titulo: 'Presentación',
      descripcion: 'Indica el formato físico del medicamento',
      cantidad: 0
    },
        {
      key: 'motivo_baja',
      url: 'motivoBaja',
      icono: 'bi bi-bag-x-fill',
      titulo: 'Motivo baja',
      descripcion: 'Especifica el motivo por el cual un producto se elimina o se retorna al stock',
      cantidad: 0
    },
  ]

  catalogoSeleccionado = '';
  catalogoUrl = '';
  
  // métodos
  
  ngOnInit(){
    this.seleccionarCatalogo(this.listaCatalogos[0].titulo, this.listaCatalogos[0].url);
    this.obtenerContedoCatalogos();
  }

  ngOnDestroy(): void {
    this.versionCatalogo++;
    this.peticionRegistros?.unsubscribe();
    this.peticionConteos?.unsubscribe();
  }
  
  seleccionarCatalogo(nombre: string, url: string) {
    if (url !== this.catalogoUrl) {
      this.versionCatalogo++;
      this.limpiarFormulario();
    }
    this.catalogoSeleccionado = nombre;
    this.catalogoUrl = url;
    this.paginaActual = 1;
    this.traerRegistros(this.mostrarActivos);
  }

// ---------------------------------------------------------------------------------
  // obtener la cantidad de registros en las tablas relacionadas con farmacia

  listaRegistrosCatalogos: registrosCatalogos[] = []; 

  obtenerContedoCatalogos(){
    this.peticionConteos?.unsubscribe();
    this.peticionConteos = this.servicioCatalogo.obtenerRegistrosCatalogosFarmacia().subscribe({
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

// determina que buscar activos o no
mostrarActivos:boolean = true;

// ------------ LISTAR REGISTROS ------------

datos: RegistroFarmacia[] = [];
paginaActual = 1;
readonly cantidadMostrar = 5;
cambiandoEstado = false;
cargandoRegistros = false;

traerRegistros(estado: boolean){
  if (estado !== this.mostrarActivos) this.paginaActual = 1;
  this.mostrarActivos = estado;
  this.peticionRegistros?.unsubscribe();
  this.cargandoRegistros = true;
  this.cdr.markForCheck();
  this.peticionRegistros = this.servicioCatalogo.listar<RegistroFarmacia>(this.catalogoUrl, estado).pipe(
    finalize(() => {
      this.cargandoRegistros = false;
      this.cdr.markForCheck();
    }),
  ).subscribe({
    next: (data)=>{
      this.datos = data;
      this.cargandoRegistros = false;
      this.paginaActual = Math.min(this.paginaActual, Math.max(1, Math.ceil(data.length / this.cantidadMostrar)));
      this.cdr.detectChanges();
    },
    error: (error) => {
      this.datos = [];
      this.paginaActual = 1;
      this.popUps.errorDesdeBackend(error, 'No se pudo actualizar la lista. Intente recargarla.');
    }
  })
}

// ---------------------------------------------------------------------------------

// actualizar estado de un registro
async activarDesactivar(event: Event, id:number){
  const checkbox = event.target;
  if (checkbox instanceof HTMLInputElement) checkbox.checked = this.mostrarActivos;
  if (this.cambiandoEstado || this.cargandoRegistros) return;
  this.cambiandoEstado = true;
  this.cdr.markForCheck();
  const url = this.catalogoUrl;
  const version = this.versionCatalogo;
  const estado = this.mostrarActivos;
  const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea cambiar el estado de este registro?').catch(() => false);

  if (!confirmado || version !== this.versionCatalogo) {
    this.cambiandoEstado = false;
    this.cdr.markForCheck();
    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = estado;
    }
    return;
  }

  this.servicioCatalogo.cambiarEstado(url, id).pipe(
    finalize(() => {
      this.cambiandoEstado = false;
      this.cdr.markForCheck();
    }),
  ).subscribe({
    next:()=>{
      if (version !== this.versionCatalogo) return;
      this.refrescarCatalogo();
    },
    error: (error) => {
      if (version !== this.versionCatalogo) return;
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = estado;
      }
      this.popUps.errorDesdeBackend(error, 'Error al cambiar el estado del registro');
    }
  })
}

// ---------------------------------------------------------------------------------

  //---------------------------- GUARDAR REGISTROS ------------------------------
  variableEntrada: RegistroFarmacia = { nombre: '', abreviatura: '' };
  guardando = false;
  
  guardar(formulario: NgForm) {
    if (this.guardando) return;
    this.guardando = true;
    this.cdr.markForCheck();
    const version = this.versionCatalogo;
    this.servicioCatalogo.crear<Inter_base>(this.catalogoUrl, this.selecciontipoDato()).pipe(
      finalize(() => {
        this.guardando = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: () => {
        if (version !== this.versionCatalogo) return;
        this.popUps.exito('Registro guardado con éxito');
        this.refrescarCatalogo();
        this.limpiarFormulario(formulario);
      },
      error: (error) => {
        if (version !== this.versionCatalogo) return;
        this.popUps.errorDesdeBackend(error, 'Error al guardar el registro');
      }
    });
  }
// ---------------------------------------------------------------------------------

// ----------------------------- HELPERS -----------------------------
  private refrescarCatalogo(): void {
    this.traerRegistros(this.mostrarActivos);
    this.obtenerContedoCatalogos();
  }

  // Helper para seleccionar el tipo de dato según el catálogo seleccionado
  selecciontipoDato(){
    if (this.catalogoSeleccionado === 'Unidad de medida') {
      return { nombre: this.variableEntrada.nombre, abreviatura: this.variableEntrada.abreviatura };
    }
    return this.catalogoSeleccionado === 'Motivo baja'
      ? { nombre: this.variableEntrada.nombre, descripcion: this.variableEntrada.descripcion ?? '' }
      : { nombre: this.variableEntrada.nombre };
  }
  // ---------------------------------------------------------------------------------

  // --------------------EDITAR REGISTRO --------------------
  editar: boolean = false;
  nombreOriginal = '';
  abreviaturaOriginal = '';
  descripcionOriginal = '';
  idRegistroSeleccionado = 0;

  //----------------
  precargar(nombre: string, id: number, abreviatura?: string, descripcion = ''){
    this.editar = true;
    this.idRegistroSeleccionado = id;
    this.variableEntrada.nombre = nombre;
    this.variableEntrada.abreviatura = abreviatura ?? '';
    this.variableEntrada.descripcion = descripcion;
    this.nombreOriginal = this.variableEntrada.nombre;
    this.abreviaturaOriginal = this.variableEntrada.abreviatura;
    this.descripcionOriginal = descripcion;
  }
  //----------------
  hayCambios(): boolean {
    if (this.variableEntrada.nombre.trim() !== this.nombreOriginal.trim()) {
      return true;
    }
    if (this.catalogoSeleccionado === 'Unidad de medida') {
      return this.variableEntrada.abreviatura.trim() !== this.abreviaturaOriginal.trim();
    }
    return this.catalogoSeleccionado === 'Motivo baja'
      && (this.variableEntrada.descripcion ?? '').trim() !== this.descripcionOriginal.trim();
  }

  //--------------
  async editarRegistro(formulario: NgForm){
    if (!this.editar || this.guardando) return;
    this.guardando = true;
    this.cdr.markForCheck();

    const url = this.catalogoUrl;
    const version = this.versionCatalogo;
    const id = this.idRegistroSeleccionado;
    const data = { ...this.selecciontipoDato() };
    const confirmado = await this.popUps.confirmarToast('¿Está seguro de que desea editar el registro?').catch(() => false);
    if (!confirmado || version !== this.versionCatalogo || !this.editar || id !== this.idRegistroSeleccionado) {
      this.guardando = false;
      this.cdr.markForCheck();
      return;
    }

    this.servicioCatalogo.actualizar1<Inter_base>(url, id, data).pipe(
      finalize(() => {
        this.guardando = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: () => {
        if (version !== this.versionCatalogo) return;
        this.popUps.exito('Registro actualizado con éxito');
        this.refrescarCatalogo();
        if (this.editar && id === this.idRegistroSeleccionado) this.limpiarFormulario(formulario);
      },
      error: (error) => {
        if (version !== this.versionCatalogo) return;
        this.popUps.errorDesdeBackend(error, 'Error al actualizar el registro');
      }
    });
  }
  // ---------------------------------------------------------------------------------

// limpiar formulario
  
limpiarFormulario(formulario?: NgForm): void {
    this.editar = false;
  formulario?.resetForm();
    this.variableEntrada.abreviatura = '';
    this.variableEntrada.nombre = '';
    this.variableEntrada.descripcion = '';
    this.cdr.markForCheck();
  }
}
  