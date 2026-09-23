import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ServicioCama } from './data/servicioCama';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { tipoDato2 } from '../../Catalogos/data/nombreInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { camaRequest, camaResponseSimple, EstadoCama } from './data/interfazCama';

@Component({
  selector: 'app-camas',
  imports: [CommonModule, FormsModule, TabSwitch],
  templateUrl: './camas.html',
  styleUrl: './camas.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Camas implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly servicioCama = inject(ServicioCama);
EstadoCama = EstadoCama;

  constructor(
    private readonly popUp: PopUps,
  ) {}

  areas: tipoDato2[] = [];
  tiposCama: tipoDato2[] = [];
  habitaciones: tipoDato2[] = [];
  mostrarActivos = true;
  filtro = 'codigo';
  busquedaEnfocada = false;
  textoBusqueda = '';
  menuCamaAbierto: number | null = null;


  ngOnInit(): void {
    this.cargarCatalogos();
    this.listarCamas();
  }

  private cargarCatalogos(): void {
    this.catalogoService.listar2('areas', true).subscribe((data) => {
      this.areas = data;
      this.cdr.detectChanges();
    });

    this.catalogoService.listar2('tiposCama', true).subscribe((data) => {
      this.tiposCama = data;
      this.cdr.detectChanges();
    });

    this.catalogoService.listar2('habitaciones', true).subscribe((data) => {
      this.habitaciones = data;
      this.cdr.detectChanges();
    });
  }

  //---------------------------------------------------
  // registrar camas
    camaRequest: camaRequest = {
    habitacionId: 0,
    tipoId: 0,
    areaId: 0,
  };
    private camaRequestInicial: camaRequest | null = null;

  validarCama(): boolean {
    if (!this.camaRequest.habitacionId || !this.camaRequest.tipoId || !this.camaRequest.areaId) {
      this.popUp.formIncompleto('Debe seleccionar tipo de cama, habitación y área.');
      return false;
    }

    return true;
  }

  crearCama(): void {
    if (!this.validarCama()) {
      return;
    }

    this.servicioCama.crearCama(this.camaRequest).subscribe({
      next: () => {
        this.popUp.exito('Cama creada exitosamente');
        this.limpiarFormulario();
        this.listarCamas();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al crear la cama');
      }
    });
  }


  //---------------------------------------------------

  // swtich de activos e inactivos
  cambiarEstado(activos: boolean): void {
    this.mostrarActivos = activos;
    this.filtro = 'codigo';
    this.textoBusqueda = '';
    this.busquedaEnfocada = false;
    this.listarCamas();
  }

  cambiarFiltro(): void {
    this.textoBusqueda = '';
    this.busquedaEnfocada = false;
  }

  //---------------------------------------
  // listar camas
  camas: camaResponseSimple[] = [];
  readonly camasPorPagina = 8;
  paginaCamas = 1;

  get totalPaginasCamas(): number {
    return Math.max(1, Math.ceil(this.camas.length / this.camasPorPagina));
  }

  get camasPaginadas(): camaResponseSimple[] {
    const inicio = (this.paginaCamas - 1) * this.camasPorPagina;
    return this.camas.slice(inicio, inicio + this.camasPorPagina);
  }

  listarCamas(){
    this.servicioCama.listarCamas(this.mostrarActivos).subscribe({
      next: (data) => {
        this.camas = data;
        this.paginaCamas = 1;
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al listar las camas');
      }
    })
  }
   //---------------------------------------

   //---------------------------------------
  // cambiar estado de cama
  cambiarEstadoCama(camaId: number, estado: EstadoCama){
    this.servicioCama.cambiarEstadoCama(camaId, estado).subscribe({
      next: () => {
        this.popUp.exito('Estado de cama actualizado exitosamente');
        this.listarCamas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al cambiar el estado de la cama');
      }
    });
  }

  alternarMenuCama(camaId: number): void {
    this.menuCamaAbierto = this.menuCamaAbierto === camaId ? null : camaId;
  }

  cerrarMenuCama(): void {
    this.menuCamaAbierto = null;
  }

  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuCamaAbierto === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.cama-card');
    if (tarjeta?.dataset['camaId'] !== String(this.menuCamaAbierto)) {
      this.cerrarMenuCama();
    }
  }

  async cambiarActivoCama(camaId: number): Promise<void> {
    const confirmacion = await this.popUp.confirmarToast('¿Estás seguro de cambiar el estado de la cama?');
    if (!confirmacion) {
      return;
    }

    this.servicioCama.cambiarActivoCama(camaId).subscribe({
      next: () => {
        this.listarCamas();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al cambiar el estado de la cama');
      }
    });
  }
   
  //---------------------------------------
  //---------------------------------------
  // editar información de cama
  isEditing: boolean = false;
  idActualizar: number | null = null;
  precargarCama(id:number){
    this.servicioCama.traerReferencias(id).subscribe({
      next: (data) => {
        this.camaRequest = data;
        this.camaRequestInicial = { ...data };
        this.isEditing = true;
        this.idActualizar = id;
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al actualizar datos de cama');
      }
    })
  }

  async actualizarCama(){
    const confirmacion = await this.popUp.confirmarToast('¿Estás seguro de actualizar la cama?');
    if (!confirmacion) {
      return;
    }

    this.servicioCama.actualizarCama(this.idActualizar!, this.camaRequest).subscribe({
      next: () => {
        this.popUp.exito('Cama actualizada exitosamente');
        this.limpiarFormulario();
        this.listarCamas();
        this.isEditing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.popUp.errorDesdeBackend('Error al actualizar la cama');
      }
    });
  }

  //---------------------------------------
    
  //---------------------------------------
  // buscar camas
  buscarCamas(texto: string){
    this.servicioCama.buscarCamas(texto, this.mostrarActivos).subscribe({
      next: (data) => {
        this.camas = data;
        this.paginaCamas = 1;
        console.log('Camas encontradas:', data);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPaginaCamas(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginasCamas) {
      return;
    }

    this.paginaCamas = pagina;
    this.cerrarMenuCama();
  }

  //---------------------------------------

  
  limpiarFormulario(): void {
    this.camaRequest = {
      habitacionId: 0,
      tipoId: 0,
      areaId: 0,
    };
    this.camaRequestInicial = null;
    this.isEditing = false;
  }

  puedeGuardar(): boolean {
    const formularioCompleto = Boolean(
      this.camaRequest.tipoId && this.camaRequest.habitacionId && this.camaRequest.areaId,
    );

    if (!formularioCompleto) {
      return false;
    }

    if (!this.camaRequestInicial) {
      return true;
    }

    return (
      this.camaRequest.tipoId !== this.camaRequestInicial.tipoId ||
      this.camaRequest.habitacionId !== this.camaRequestInicial.habitacionId ||
      this.camaRequest.areaId !== this.camaRequestInicial.areaId
    );
  }
}
