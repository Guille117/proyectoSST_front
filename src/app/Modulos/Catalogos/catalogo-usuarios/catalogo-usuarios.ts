import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ConteoCatalogosUsuarios, Inter_base } from '../data/nombreInterfaz';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { CatalogoService } from '../data/serviceCatalogo';

@Component({
  selector: 'app-catalogo-usuarios',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './catalogo-usuarios.html',
  styleUrl: '../catalogo-farmacia/catalogo-farmacia.scss',
})
export class CatalogoUsuarios implements OnInit, OnDestroy {
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
  // catálogo de usuarios
  listaCatalogos = [
    {
      key: 'Puestos',
      url: 'puestos',
      icono: 'bi bi-briefcase',
      titulo: 'Puesto',
      descripcion: 'Indica los puestos posibles para usuarios',
      cantidad: 0
    },
    {
      key: 'Especialidades',
      url: 'especialidades',
      icono: 'bi bi-heart-pulse',
      titulo: 'Especialidad médica',
      descripcion: 'Indica las especialidades disponibles para médicos',
      cantidad: 0
    },
  ];
   
  catalogoSeleccionado = '';
  catalogoUrl = '';

  // métodos

  ngOnInit(): void {
    this.seleccionarCatalogo(this.listaCatalogos[0].titulo, this.listaCatalogos[0].url);
    this.obtenerConteoCatalogos();
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
  // obtener la cantidad de registros en las tablas relacionadas con usuarios

  conteosCatalogos: ConteoCatalogosUsuarios = { puestos: 0, especialidades: 0 };

  obtenerConteoCatalogos(){
    this.peticionConteos?.unsubscribe();
    this.peticionConteos = this.servicioCatalogo.obtenerConteoCatalogosUsuarios().subscribe({
      next: (data) => {
        this.conteosCatalogos = data;
        this.llenarConetoACatalogos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUps.error('Error al obtener los registros de los catálogos de usuario');
      }
    });
  }

// llenar la info a los catálogos
  llenarConetoACatalogos() {
    this.listaCatalogos[0].cantidad = this.conteosCatalogos.puestos;
    this.listaCatalogos[1].cantidad = this.conteosCatalogos.especialidades;
  }
// ---------------------------------------------------------------------------------

// determina que buscar activos o no
  mostrarActivos: boolean = true;

// ------------ LISTAR REGISTROS ------------

  datos: Inter_base[] = [];
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
    this.peticionRegistros = this.servicioCatalogo.listar<Inter_base>(this.catalogoUrl, estado).pipe(
      finalize(() => {
        this.cargandoRegistros = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: (data) => {
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
      next: () => {
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
  variableEntrada: Inter_base = { nombre: '' };
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
    this.obtenerConteoCatalogos();
  }

  // Helper para seleccionar el tipo de dato según el catálogo seleccionado
  selecciontipoDato(): Inter_base {
    return { nombre: this.variableEntrada.nombre };
  }
  // ---------------------------------------------------------------------------------

  // --------------------EDITAR REGISTRO --------------------
  editar: boolean = false;
  nombreOriginal = '';
  idRegistroSeleccionado = 0;

  //----------------
  precargar(nombre: string, id: number){
    this.editar = true;
    this.variableEntrada.nombre = nombre;
    this.nombreOriginal = nombre;
    this.idRegistroSeleccionado = id;
  }

  //----------------
  hayCambios(): boolean {
    return this.variableEntrada.nombre.trim() !== this.nombreOriginal.trim();
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
    this.variableEntrada.nombre = '';
    this.cdr.markForCheck();
  }
}
 