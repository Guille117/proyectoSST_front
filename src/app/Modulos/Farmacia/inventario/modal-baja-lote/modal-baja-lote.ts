import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { ModalAction, ModalService } from '../../../../modal-principal/modal-service';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../../shared/opcion-otro/opcion-otro';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
import { Inter_base } from '../../../Catalogos/data/nombreInterfaz';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { BajaLoteRequest, InventarioResponse } from '../data/interfaz-inventario';
import { ServicioInventario } from '../data/servicio-inventario';

@Component({
  selector: 'app-modal-baja-lote',
  imports: [FormsModule, CampoValidado, OpcionOtroComponent],
  templateUrl: './modal-baja-lote.html',
  styleUrl: './modal-baja-lote.scss',
})
export class ModalBajaLote implements OnInit {
  @Input() lote: InventarioResponse | null = null;
  @Input() onGuardado?: () => void;

  private readonly catalogoService = inject(CatalogoService);
  private readonly servicioInventario = inject(ServicioInventario);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  motivos: Inter_base[] = [];
  cargandoMotivos = false;
  errorMotivos = '';
  guardando = false;

  cantidad: number | null = null;
  motivoBajaId: number | null = null;
  observacion = '';

  readonly opcionOtroId = -1;
  mostrandoOtroMotivo = false;
  creandoMotivo = false;
  private motivoAnterior: number | null = null;

  private readonly meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  get modalActions(): ModalAction[] {
    return [
      {
        id: 'cancelar',
        label: 'Cancelar',
        className: '_cancelar',
        onClick: () => this.modalService.close(),
      },
      {
        id: 'guardar',
        label: 'Registrar baja',
        className: '_guardar',
        onClick: () => this.confirmar(),
        disabled: () => !this.formularioValido(),
      },
    ];
  }

  /** Habilita el registro solo cuando los datos obligatorios son válidos. */
  formularioValido(): boolean {
    const cantidad = Number(this.cantidad);
    const disponible = this.lote?.disponible ?? 0;

    return (
      Number.isInteger(cantidad) &&
      cantidad > 0 &&
      cantidad <= disponible &&
      this.motivoBajaId !== null
    );
  }

  /** Mensaje de error de la cantidad según el dato ingresado. */
  get mensajeErrorCantidad(): string {
    const cantidad = Number(this.cantidad);

    if (!this.cantidad || !Number.isFinite(cantidad) || cantidad < 1) {
      return 'Ingrese la cantidad a eliminar';
    }

    return `La cantidad no puede superar el disponible (${this.lote?.disponible ?? 0})`;
  }

  ngOnInit(): void {
    this.cargarMotivos();
  }

  /** Nombre del medicamento sin el fabricante y con la concentración precedida de «de». */
  get nombreMedicamento(): string {
    const nombre = this.lote?.nombre?.trim();
    if (!nombre) return '—';
    if (this.lote?.tipo !== 'MEDICAMENTO') return nombre;

    const fabricante = this.fabricante;
    let nombreBase = nombre;

    if (fabricante !== '—') {
      nombreBase = nombreBase
        .replace(new RegExp(`\\s*\\b${this.escaparRegex(fabricante)}\\b\\s*`, 'i'), ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (/(^|\s)de\s+\d/i.test(nombreBase)) return nombreBase;

    return nombreBase.replace(
      /\s+(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|ui|%)?\b.*)$/i,
      ' de $1',
    );
  }

  /** Fabricante del medicamento, tomado de la descripción del lote. */
  get fabricante(): string {
    const lote = this.lote;
    if (lote?.tipo !== 'MEDICAMENTO' || !lote.descripcion) return '—';

    const presentacion = lote.presentacion?.trim().toLowerCase() ?? '';
    const partes = lote.descripcion
      .split('·')
      .map((parte) => parte.trim())
      .filter(Boolean);

    return (
      partes.find(
        (parte) =>
          parte.toLowerCase() !== presentacion && !/^\d+(?:[.,]\d+)?\s*[a-zµ%]+$/i.test(parte),
      ) ?? '—'
    );
  }

  confirmar(): void {
    const lote = this.lote;
    if (!lote || this.guardando) return;

    const cantidad = Number(this.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      this.popUps.advertencia('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    if (cantidad > lote.disponible) {
      this.popUps.advertencia(
        `La cantidad no puede superar el disponible del lote (${lote.disponible}).`,
      );
      return;
    }

    if (this.motivoBajaId === null) {
      this.popUps.formIncompleto('Seleccione un motivo de baja.');
      return;
    }

    const idUsuario = this.authService.currentUser()?.id;
    if (!idUsuario || idUsuario <= 0) {
      this.popUps.advertencia('No se pudo identificar al usuario de la sesión.');
      return;
    }

    const baja: BajaLoteRequest = {
      idLote: lote.id,
      cantidad,
      idMotivoBaja: this.motivoBajaId,
      observacion: this.observacion.trim(),
      idUsuario,
    };

    this.guardando = true;
    this.cdr.markForCheck();

    this.servicioInventario
      .registrarBaja(baja)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUps.exito('Baja registrada exitosamente.');
          this.modalService.close();
          this.onGuardado?.();
        },
        error: (error) => {
          const mensaje =
            error instanceof TimeoutError
              ? 'Error de comunicación. El servidor no respondió dentro del tiempo esperado.'
              : 'No se pudo registrar la baja. Intente nuevamente.';

          if (error instanceof TimeoutError) {
            this.popUps.error(mensaje);
          } else {
            this.popUps.errorDesdeBackend(error, mensaje);
          }
        },
      });
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';

    const [fechaParte] = fecha.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);

    if (!anio || !mes || !dia || mes < 1 || mes > 12) return fecha;

    return `${this.meses[mes - 1]} ${dia}, ${anio}`;
  }

  /** Indica si la fecha de vencimiento ya pasó. */
  esFechaVencida(fecha: string | null | undefined): boolean {
    const valor = this.fechaComoDate(fecha);
    return valor !== null && valor < this.fechaHoy();
  }

  private fechaComoDate(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;

    const [fechaParte] = fecha.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);
    if (!anio || !mes || !dia) return null;

    return new Date(anio, mes - 1, dia);
  }

  private fechaHoy(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  }

  private escaparRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private cargarMotivos(): void {
    this.cargandoMotivos = true;
    this.errorMotivos = '';
    this.cdr.markForCheck();

    this.catalogoService
      .listar<Inter_base>('motivoBaja', true)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoMotivos = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (motivos) => {
          this.motivos = motivos;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMotivos = 'No se pudieron cargar los motivos de baja.';
          this.cdr.markForCheck();
          this.popUps.errorDesdeBackend(error, this.errorMotivos);
        },
      });
  }

  alElegirMotivo(valor: number | null): void {
    if (valor === this.opcionOtroId) {
      this.motivoAnterior = this.motivoBajaId;
      this.motivoBajaId = null;
      this.mostrandoOtroMotivo = true;
      return;
    }

    this.motivoBajaId = valor;
  }

  crearMotivo(datos: OpcionOtroValor): void {
    if (this.creandoMotivo) return;

    this.creandoMotivo = true;
    this.catalogoService
      .crear<Inter_base>('motivoBaja', { nombre: datos.nombre })
      .pipe(
        timeout(5000),
        finalize(() => {
          this.creandoMotivo = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creado) => {
          if (creado.id == null) return;

          this.motivos = [...this.motivos, creado];
          this.motivoBajaId = creado.id;
          this.mostrandoOtroMotivo = false;
          this.cdr.markForCheck();
        },
        error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudo crear el motivo de baja.'),
      });
  }

  cancelarMotivo(): void {
    this.mostrandoOtroMotivo = false;
    this.motivoBajaId = this.motivoAnterior;
  }
}
