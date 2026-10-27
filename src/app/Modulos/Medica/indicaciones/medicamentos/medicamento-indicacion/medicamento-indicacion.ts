import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, timeout, TimeoutError } from 'rxjs';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../../../shared/opcion-otro/opcion-otro';
import { Paginacion } from '../../../../../shared/paginacion/paginacion';
import { PopUps } from '../../../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../../../Catalogos/data/serviceCatalogo';
import { TIMEOUT_HTTP_MS } from '../../../evaluacion/data/constantes-clinicas';
import { MedicamentoCatalogoResponse } from '../data/medicamentoInterfaz';
import { MedicamentoIndicacionService } from '../data/medicamento-service';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Tipos de duración del tratamiento; el número de días solo se usa con el tipo «días». */
export type TipoDuracion = 'dias' | 'unica' | 'indefinida';

/** Medicamento del catálogo que devuelve la búsqueda: son las columnas de la tabla de resultados. */
export interface MedicamentoCatalogoVista {
  id: number;
  nombre: string;
  presentacion: string;
  administracion: string;
  disponible: number;
}

/** Medicamento indicado al paciente: lo que captura el formulario de la tarjeta. */
export interface MedicamentoTratamiento {
  nombre: string;
  /** ID del medicamento del catálogo; null cuando el medicamento no está registrado. */
  medicamentoLogId?: number | null;
  /** Texto libre del medicamento no registrado. */
  medicamentoLibre?: string;
  cantidad: number | null;
  unidadMedida: string;
  frecuencia: number | null;
  duracionTipo: TipoDuracion | '';
  duracionCantidad: number | null;
  observaciones: string;
}

/** Opción del desplegable del tipo de duración: el valor que se registra y su etiqueta. */
interface OpcionVista {
  id: TipoDuracion;
  nombre: string;
}

/** Tipos de duración del desplegable; con ellos se describe la duración de lo ya agregado. */
export const TIPOS_DURACION: OpcionVista[] = [
  { id: 'dias', nombre: 'Días' },
  { id: 'unica', nombre: 'Dosis única' },
  { id: 'indefinida', nombre: 'Por tiempo indefinido' },
];

/** Texto de la duración de un medicamento: sus días o el nombre del tipo elegido. */
export function textoDuracion(medicamento: MedicamentoTratamiento): string {
  if (medicamento.duracionTipo === 'dias') {
    return `${medicamento.duracionCantidad} días`;
  }

  return TIPOS_DURACION.find((opcion) => opcion.id === medicamento.duracionTipo)?.nombre ?? '';
}

/**
 * Tarjeta del bloque de medicamentos del tratamiento: busca el medicamento en el catálogo —con su
 * tabla de resultados paginada de cinco en cinco y su pie— y captura la cantidad, la frecuencia, la
 * duración y las observaciones. Al guardar entrega el medicamento a la pantalla que la abrió y al
 * cancelar le avisa para que vuelva a su formulario: la pantalla solo decide cuándo se muestra.
 */
@Component({
  selector: 'app-medicamento-indicacion',
  imports: [FormsModule, OpcionOtroComponent, Paginacion],
  templateUrl: './medicamento-indicacion.html',
  styleUrl: './medicamento-indicacion.scss',
})
export class MedicamentoIndicacion implements OnInit, OnChanges, OnDestroy {
  private readonly catalogoService = inject(CatalogoService);
  private readonly medicamentoService = inject(MedicamentoIndicacionService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private peticionUnidades?: Subscription;
  private peticionCatalogo?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario del medicamento. */
  medicamento = '';
  /** Texto libre cuando el medicamento no está registrado en el catálogo. */
  medicamentoLibre = '';
  cantidad: number | null = null;
  unidadMedida = '';
  readonly opcionOtroId = '__otro__';
  mostrandoOtroUnidad = false;
  creandoUnidad = false;
  private unidadAnterior = '';
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
  observaciones = '';

  /** Unidades de medida del catálogo; «Gotas» se agrega siempre al final. */
  unidadesMedida: string[] = ['Gotas'];

  /** Medicamentos que devolvió la última búsqueda: alimentan la tabla de resultados del formulario. */
  medicamentosEncontrados: MedicamentoCatalogoVista[] = [];

  /**
   * La búsqueda está desplegada: la tarjeta muestra su buscador con la tabla de resultados y oculta
   * el resto de campos hasta que se elija un medicamento.
   */
  busquedaMedicamentoRealizada = false;

  /** La búsqueda está esperando la respuesta del catálogo. */
  cargandoCatalogo = false;

  /** Página de la tabla de resultados que se está viendo. */
  paginaMedicamentos = 1;

  /** Medicamentos que muestra cada página de la tabla de resultados. */
  readonly medicamentosPorPagina = 5;

  /** Medicamento del catálogo elegido para el tratamiento; null mientras no se elija ninguno. */
  medicamentoElegido: MedicamentoCatalogoVista | null = null;

  // ------------------- ENTRADAS Y SALIDAS -------------------
  /** El título de la tarjeta se oculta cuando la pantalla ya lo muestra en sus pestañas. */
  @Input() mostrarTitulo = true;

  /** Medicamento que se carga en el formulario para corregirlo; null al capturar uno nuevo. */
  @Input() medicamentoInicial: MedicamentoTratamiento | null = null;

  /** Medicamento capturado, con sus datos, para la pantalla que abrió la tarjeta. */
  @Output() medicamentoAgregado = new EventEmitter<MedicamentoTratamiento>();

  /** La captura se descartó: la pantalla que abrió la tarjeta vuelve a su formulario. */
  @Output() cancelado = new EventEmitter<void>();

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarUnidadesMedida();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionUnidades?.unsubscribe();
    this.peticionCatalogo?.unsubscribe();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['medicamentoInicial']) {
      this.cargarInicial(this.medicamentoInicial);
    }
  }

  /** Carga del catálogo las unidades de medida y les suma «Gotas». */
  private cargarUnidadesMedida(): void {
    this.peticionUnidades = this.catalogoService
      .listarUnidadMedida()
      .pipe(timeout(TIMEOUT_HTTP_MS))
      .subscribe({
        next: (unidades) => {
          this.unidadesMedida = this.combinarUnidades(unidades.map((unidad) => unidad.nombre));
          this.cdr.markForCheck();
        },
        error: () => {
          // Si falla el catálogo, queda disponible al menos «Gotas».
        },
      });
  }

  alElegirUnidad(valor: string): void {
    if (valor === this.opcionOtroId) {
      this.unidadAnterior = this.unidadMedida;
      this.unidadMedida = '';
      this.mostrandoOtroUnidad = true;
      return;
    }

    this.unidadMedida = valor;
  }

  crearUnidad(datos: OpcionOtroValor): void {
    if (this.creandoUnidad || !datos.abreviatura) return;

    this.creandoUnidad = true;
    this.catalogoService
      .guardarUnidadMedida(datos.nombre, datos.abreviatura)
      .pipe(
        timeout(TIMEOUT_HTTP_MS),
        finalize(() => {
          this.creandoUnidad = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (creada) => {
          if (this.destruido) return;

          const nombre = creada.nombre?.trim() || datos.nombre;
          this.unidadesMedida = this.combinarUnidades([...this.unidadesMedida, nombre]);
          this.unidadMedida = nombre;
          this.mostrandoOtroUnidad = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido) return;

          this.popUps.errorDesdeBackend(error, 'No se pudo crear la unidad de medida.');
        },
      });
  }

  cancelarUnidad(): void {
    this.mostrandoOtroUnidad = false;
    this.unidadMedida = this.unidadAnterior;
  }

  /** Une las unidades del catálogo con «Gotas», sin repetir nombres equivalentes. */
  private combinarUnidades(unidades: string[]): string[] {
    const resultado: string[] = [];
    const vistos = new Set<string>();

    for (const unidad of [...unidades, 'Gotas']) {
      const nombre = unidad?.trim();
      if (!nombre) continue;

      const clave = this.singularizar(nombre.toLowerCase());
      if (vistos.has(clave)) continue;

      vistos.add(clave);
      resultado.push(nombre);
    }

    return resultado;
  }

  /** Singular de la unidad: «tabletas» → «tableta», «unidades» → «unidad». */
  private singularizar(unidad: string): string {
    if (unidad.endsWith('idades')) return unidad.slice(0, -2);
    if (unidad.endsWith('s') && !unidad.endsWith('sis')) return unidad.slice(0, -1);
    return unidad;
  }

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion: OpcionVista[] = TIPOS_DURACION;

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Hay un medicamento escrito en el buscador. */
  get hayMedicamento(): boolean {
    return this.medicamento.trim().length > 0;
  }

  /** Hay un medicamento del catálogo o un medicamento libre listo para indicar. */
  get hayMedicamentoSeleccionado(): boolean {
    return this.medicamentoElegido !== null || this.medicamentoLibre.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el tratamiento. */
  get faltaDuracionEnDias(): boolean {
    return this.faltaDuracionEnDiasDe(this.duracionTipo, this.duracionCantidad);
  }

  /**
   * El botón Guardar se habilita con un medicamento del catálogo o uno libre, la cantidad y la
   * frecuencia enteras, la duración resuelta y las observaciones dentro del límite del backend.
   */
  get puedeGuardar(): boolean {
    return (
      !this.busquedaMedicamentoRealizada &&
      this.hayMedicamentoSeleccionado &&
      !this.faltaDuracionEnDias &&
      this.duracionTipo !== '' &&
      this.cantidad !== null &&
      Number.isInteger(this.cantidad) &&
      this.cantidad > 0 &&
      this.frecuencia !== null &&
      Number.isInteger(this.frecuencia) &&
      this.frecuencia > 0 &&
      this.observaciones.length <= 2000
    );
  }

  /** Filas de la página actual de la tabla de resultados. */
  get medicamentosDeLaPagina(): MedicamentoCatalogoVista[] {
    const inicio = (this.paginaMedicamentos - 1) * this.medicamentosPorPagina;

    return this.medicamentosEncontrados.slice(inicio, inicio + this.medicamentosPorPagina);
  }

  /** Número que le corresponde a la primera fila de la página actual de la tabla. */
  get numeroInicialDeLaPagina(): number {
    return (this.paginaMedicamentos - 1) * this.medicamentosPorPagina + 1;
  }

  /** Texto del medicamento elegido: su descripción o el texto libre no registrado. */
  get textoMedicamentoElegido(): string {
    if (this.medicamentoLibre.trim()) {
      return `${this.medicamentoLibre.trim()} · No registrado`;
    }

    const elegido = this.medicamentoElegido;
    if (!elegido) return '';

    const partes = [elegido.nombre];
    if (elegido.presentacion) partes.push(elegido.presentacion);
    if (elegido.administracion) {
      partes.push(`administración ${elegido.administracion.toLowerCase()}`);
    }

    return partes.join(', ');
  }

  /** Texto de la tabla de resultados cuando la búsqueda no encuentra medicamentos en el catálogo. */
  get mensajeSinMedicamentosEncontrados(): string {
    const termino = this.medicamento.trim();

    return termino
      ? `No se encontraron medicamentos que coincidan con «${termino}».`
      : 'El catálogo no tiene medicamentos para mostrar.';
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Descripción del medicamento para la tabla de resultados: su nombre y su presentación. */
  descripcionMedicamento(opcion: MedicamentoCatalogoVista): string {
    return `${opcion.nombre} ${opcion.presentacion}`;
  }

  /** Busca el medicamento escrito en el catálogo real y muestra las coincidencias en la tabla. */
  buscarMedicamento(): void {
    if (this.cargandoCatalogo) return;

    this.busquedaMedicamentoRealizada = true;
    this.paginaMedicamentos = 1;
    this.cargandoCatalogo = true;
    this.peticionCatalogo?.unsubscribe();

    this.peticionCatalogo = this.medicamentoService
      .buscarCatalogo(this.medicamento)
      .pipe(
        finalize(() => {
          this.cargandoCatalogo = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (catalogo) => {
          this.medicamentosEncontrados = catalogo.map((opcion) => this.aVista(opcion));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.medicamentosEncontrados = [];
          this.cdr.markForCheck();
          if (error instanceof TimeoutError) {
            this.popUps.error(
              'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
            );
            return;
          }
          this.popUps.errorDesdeBackend(
            error,
            'No se pudo buscar en el catálogo de medicamentos.',
          );
        },
      });
  }

  /** Traduce el medicamento del catálogo al modelo de la tabla de resultados. */
  private aVista(opcion: MedicamentoCatalogoResponse): MedicamentoCatalogoVista {
    const nombre = [opcion.nombre, opcion.marca]
      .filter((parte) => parte?.trim())
      .join(' ')
      .trim();

    return {
      id: opcion.id,
      nombre,
      presentacion: opcion.presentacion ?? '',
      administracion: opcion.viaAdministracion ?? '',
      disponible: opcion.disponible,
    };
  }

  /** Muestra otra página de la tabla de resultados. */
  seleccionarPaginaMedicamentos(pagina: number): void {
    this.paginaMedicamentos = pagina;
  }

  /**
   * Elige el medicamento pulsado en la tabla de resultados: su descripción queda registrada en el
   * formulario, el buscador con la tabla dejan su sitio al medicamento elegido y vuelven los campos.
   */
  seleccionarMedicamento(opcion: MedicamentoCatalogoVista): void {
    this.cerrarResultadosMedicamento();
    this.medicamento = this.descripcionMedicamento(opcion);
    this.medicamentoLibre = '';
    this.medicamentoElegido = opcion;
  }

  /** Indica como medicamento no registrado el texto escrito en el buscador. */
  usarMedicamentoLibre(): void {
    const texto = this.medicamento.trim();
    if (!texto) {
      this.popUps.advertencia('Escriba el medicamento o sus detalles.');
      return;
    }

    this.medicamentoLibre = texto;
    this.medicamentoElegido = null;
    this.cerrarResultadosMedicamento();
  }

  /** Devuelve el formulario al buscador para elegir otro medicamento en lugar del elegido. */
  cambiarMedicamento(): void {
    this.medicamento = '';
    this.medicamentoLibre = '';
    this.cerrarResultadosMedicamento();
    this.buscarMedicamento();
  }

  /** Cierra la tabla de resultados de la búsqueda y suelta el medicamento elegido. */
  cerrarResultadosMedicamento(): void {
    this.busquedaMedicamentoRealizada = false;
    this.paginaMedicamentos = 1;
    this.medicamentosEncontrados = [];
    this.medicamentoElegido = null;
  }

  /** Entrega a la pantalla que abrió la tarjeta el medicamento capturado. */
  agregarMedicamento(): void {
    if (!this.puedeGuardar) {
      return;
    }

    this.medicamentoAgregado.emit({
      nombre: this.medicamento.trim(),
      medicamentoLogId: this.medicamentoElegido?.id ?? null,
      medicamentoLibre: this.medicamentoElegido ? '' : this.medicamentoLibre.trim(),
      cantidad: this.cantidad,
      unidadMedida: this.unidadMedida,
      frecuencia: this.frecuencia,
      duracionTipo: this.duracionTipo,
      // El número de días solo se guarda con el tipo «días»
      duracionCantidad: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      observaciones: this.observaciones.trim(),
    });

    this.limpiarFormulario();
  }

  /** Descarta la captura y avisa a la pantalla que abrió la tarjeta para que vuelva a su formulario. */
  cancelarCaptura(): void {
    this.limpiarFormulario();
    this.cancelado.emit();
  }

  /** Deja el formulario listo para capturar un medicamento nuevo. */
  limpiarFormulario(): void {
    this.medicamento = '';
    this.medicamentoLibre = '';
    this.cantidad = null;
    this.unidadMedida = '';
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.observaciones = '';
    this.cerrarResultadosMedicamento();
  }

  // ------------------- APOYO -------------------
  /** Carga el medicamento que se va a editar o limpia el formulario al empezar una captura nueva. */
  private cargarInicial(medicamento: MedicamentoTratamiento | null): void {
    if (!medicamento) {
      this.limpiarFormulario();
      return;
    }

    this.medicamento = medicamento.nombre;
    this.medicamentoLibre = medicamento.medicamentoLibre ?? '';
    this.medicamentoElegido = this.medicamentoLibre
      ? null
      : {
          id: medicamento.medicamentoLogId ?? 0,
          nombre: medicamento.nombre,
          presentacion: '',
          administracion: '',
          disponible: 0,
        };
    this.cantidad = medicamento.cantidad;
    this.unidadMedida = medicamento.unidadMedida;
    this.frecuencia = medicamento.frecuencia;
    this.duracionTipo = medicamento.duracionTipo;
    this.duracionCantidad = medicamento.duracionCantidad;
    this.observaciones = medicamento.observaciones;
    this.busquedaMedicamentoRealizada = false;
    this.medicamentosEncontrados = [];
    this.paginaMedicamentos = 1;
  }

  /** La duración en días solo está resuelta cuando se han escrito los días del tratamiento. */
  private faltaDuracionEnDiasDe(tipo: TipoDuracion | '', cantidad: number | null): boolean {
    return tipo === 'dias' && (cantidad ?? 0) <= 0;
  }
}
