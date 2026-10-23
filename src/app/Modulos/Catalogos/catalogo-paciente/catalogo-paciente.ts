import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { Inter_base, Inter_descripcion, Inter_institucion, registrosCatalogos } from '../data/nombreInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { CatalogoService } from '../data/serviceCatalogo';
import { calcularFilasVisibles, FILAS_VISIBLES_POR_DEFECTO } from '../../../shared/paginacion/filas-visibles';

type RegistroPaciente = Inter_base & Partial<Inter_descripcion & Inter_institucion>;

@Component({
  selector: 'app-catalogo-paciente',
  imports: [CommonModule, FormsModule, TabSwitch, Paginacion],
  templateUrl: './catalogo-paciente.html',
  styleUrl: '../catalogo-farmacia/catalogo-farmacia.scss',
})
export class CatalogoPaciente implements OnInit, OnDestroy {
  private peticionRegistros?: Subscription;
  private peticionConteos?: Subscription;
  private versionCatalogo = 0;
  @ViewChild('panelTabla') private panelTabla?: ElementRef<HTMLElement>;

  constructor(
    private cdr: ChangeDetectorRef,
    private popUps: PopUps,
    private servicioCatalogo: CatalogoService,
  ) {
  }

  // variables
  // catálogos de pacientes
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
      key: 'instituciones',
      url: 'instituciones',
      icono: 'bi bi-building',
      titulo: 'Institución',
      descripcion: 'Indica las instituciones de referencia',
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
    {
      key: 'parentescos',
      url: 'parentescos',
      icono: 'bi bi-people',
      titulo: 'Parentesco',
      descripcion: 'Indica el parentesco de los contactos del paciente',
      cantidad: 0
    },
    {
      key: 'alergias',
      url: 'alergias',
      icono: 'bi bi-exclamation-triangle',
      titulo: 'Alergia',
      descripcion: 'Indica las alergias registradas para los pacientes',
      cantidad: 0
    },
    {
      key: 'enfermedades',
      url: 'enfermedades',
      icono: 'bi bi-activity',
      titulo: 'Enfermedad',
      descripcion: 'Indica las enfermedades registradas para los pacientes',
      cantidad: 0
    },
    {
      key: 'areas',
      url: 'areas',
      icono: 'bi bi-geo-alt',
      titulo: 'Área',
      descripcion: 'Indica las áreas donde se encuentran las camas y habitaciones',
      cantidad: 0
    },
  ];
   
  catalogoSeleccionado = '';
  catalogoUrl = '';
  readonly catalogosPorPagina = 5;
  paginaCatalogos = 1;

  get catalogosPaginados() {
    const inicio = (this.paginaCatalogos - 1) * this.catalogosPorPagina;
    return this.listaCatalogos.slice(inicio, inicio + this.catalogosPorPagina);
  }

  get totalPaginasCatalogos(): number {
    return Math.max(1, Math.ceil(this.listaCatalogos.length / this.catalogosPorPagina));
  }

  cambiarPaginaCatalogos(pagina: number): void {
    this.paginaCatalogos = Math.min(Math.max(pagina, 1), this.totalPaginasCatalogos);
  }

  // métodos

  ngOnInit(): void {
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
  // obtener la cantidad de registros en las tablas relacionadas con pacientes

  listaRegistrosCatalogos: registrosCatalogos[] = [];

  obtenerContedoCatalogos(){
    this.peticionConteos?.unsubscribe();
    this.peticionConteos = this.servicioCatalogo.obtenerRegistrosCatalogosPacientes().subscribe({
      next: (data) => {
        this.listaRegistrosCatalogos = data;
        this.llenarConetoACatalogos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUps.error('Error al obtener los registros de los catálogos de pacientes');
      }
    })
  }

// llenar la info a los catálogos
  llenarConetoACatalogos() {
    for (const catalogo of this.listaCatalogos) {
      catalogo.cantidad = this.listaRegistrosCatalogos.find(registro => registro.tabla === catalogo.key)?.total || 0;
    }
  }
// ---------------------------------------------------------------------------------

// determina que buscar activos o no
  mostrarActivos: boolean = true;

// ------------ LISTAR REGISTROS ------------

  datos: RegistroPaciente[] = [];
  paginaActual = 1;
  cantidadMostrar = FILAS_VISIBLES_POR_DEFECTO;
  cambiandoEstado = false;
  cargandoRegistros = false;

  @HostListener('window:resize')
  ajustarCantidadMostrar(): void {
    const cantidad = calcularFilasVisibles(this.panelTabla?.nativeElement ?? null);
    if (cantidad === this.cantidadMostrar) return;
    this.cantidadMostrar = cantidad;
    this.paginaActual = 1;
    this.cdr.detectChanges();
  }

  traerRegistros(estado: boolean){
    if (estado !== this.mostrarActivos) this.paginaActual = 1;
    this.mostrarActivos = estado;
    this.peticionRegistros?.unsubscribe();
    this.cargandoRegistros = true;
    this.cdr.markForCheck();
    this.peticionRegistros = this.servicioCatalogo.listar<RegistroPaciente>(this.catalogoUrl, estado).pipe(
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
        this.ajustarCantidadMostrar();
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
  variableEntrada: Inter_descripcion & Inter_institucion = {
    nombre: '', descripcion: '', telefono: '', direccion: ''
  };
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
  selecciontipoDato(): Inter_base | Inter_descripcion | Inter_institucion {
    if (this.esCatalogoSimple) return { nombre: this.variableEntrada.nombre };
    return this.catalogoSeleccionado === 'Institución'
      ? { nombre: this.variableEntrada.nombre, telefono: this.variableEntrada.telefono, direccion: this.variableEntrada.direccion }
      : { nombre: this.variableEntrada.nombre, descripcion: this.variableEntrada.descripcion };
  }

  /** Catálogos que solo manejan el nombre del registro. */
  get esCatalogoSimple(): boolean {
    return this.catalogoSeleccionado === 'Parentesco'
      || this.catalogoSeleccionado === 'Área'
      || this.catalogoSeleccionado === 'Alergia'
      || this.catalogoSeleccionado === 'Enfermedad';
  }
  // ---------------------------------------------------------------------------------

  // --------------------EDITAR REGISTRO --------------------
  editar: boolean = false;
  nombreOriginal = '';
  descripcionOriginal = '';
  telefonoOriginal = '';
  direccionOriginal = '';
  idRegistroSeleccionado = 0;

  //----------------
  precargar(nombre: string, id: number, descripcion = '', telefono = '', direccion = ''){
    this.editar = true;
    this.idRegistroSeleccionado = id;
    this.variableEntrada = { nombre, descripcion, telefono, direccion };
    this.nombreOriginal = nombre;
    this.descripcionOriginal = descripcion;
    this.telefonoOriginal = telefono;
    this.direccionOriginal = direccion;
  }

  //----------------
  hayCambios(): boolean {
    if (this.variableEntrada.nombre.trim() !== this.nombreOriginal.trim()) return true;
    if (this.catalogoSeleccionado === 'Institución') {
      return this.variableEntrada.telefono.trim() !== this.telefonoOriginal.trim()
        || this.variableEntrada.direccion.trim() !== this.direccionOriginal.trim();
    }
    if (this.esCatalogoSimple) return false;
    return this.variableEntrada.descripcion.trim() !== this.descripcionOriginal.trim();
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
    this.variableEntrada = { nombre: '', descripcion: '', telefono: '', direccion: '' };
    this.cdr.markForCheck();
  }
}
