import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampoValidado } from "../../../../shared/campo-validado/campo-validado";
import { PuestoService } from '../data/puesto-service';
import { UsuarioService } from '../data/usuario-service';
import { HorarioService } from '../../horarios/data/horario-service';
import { RolService } from '../../roles/data/rol-service';
import { PuestoResponse, PersonaDatos, UsuarioRequest, UsuarioResponse } from '../data/usuarioInterfaz';
import { HorarioResponse } from '../../horarios/data/horarioInterfaz';
import { RolResponse } from '../../roles/data/rolInterfaz';
import { ModalService } from '../../../../modal-principal/modal-service';
import { PopUps } from '../../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-modal-agregar-uusuario',
  imports: [CommonModule, FormsModule, CampoValidado],
  templateUrl: './modal-agregar-uusuario.html',
  styleUrl: './modal-agregar-uusuario.scss',
})
export class ModalAgregarUusuario implements OnInit, OnChanges {
  @Input() isEditing = false;
  @Input() usuarioToEdit?: UsuarioResponse;
  @Input() onSuccess?: () => void;

  contador: number = 0;

  puestos: PuestoResponse[] = [];
  horarios: HorarioResponse[] = [];
  roles: RolResponse[] = [];

  persona: PersonaDatos = {
    cui: '',
    nombres: '',
    apellidos: '',
    sexo: 'MASCULINO',
    fechaNacimiento: '',
    telefono: '',
    email: '',
  };

  usuarioReq: Partial<UsuarioRequest> = {
    puestoId: 0,
    horarioId: 0,
    rolId: 0,
    username: '',
    estado: true,
  };

  constructor(
    private puestoService: PuestoService,
    private horarioService: HorarioService,
    private rolService: RolService,
    private usuarioService: UsuarioService,
    private modalService: ModalService,
    private popUps: PopUps,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDatosEdicion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuarioToEdit'] || changes['isEditing']) {
      this.cargarDatosEdicion();
    }
  }

  get puedeAvanzarPaso1(): boolean {
    return !!(
      this.persona.nombres?.trim() &&
      this.persona.apellidos?.trim() &&
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(this.persona.nombres.trim()) &&
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(this.persona.apellidos.trim()) &&
      /^[0-9]{13}$/.test(this.persona.cui?.trim() || '') &&
      this.persona.sexo &&
      this.persona.fechaNacimiento &&
      /^[0-9]{8}$/.test(this.persona.telefono?.trim() || '') &&
      (!this.persona.email?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.persona.email.trim()))
    );
  }

  get puedeGuardarPaso2(): boolean {
    return !!(
      this.usuarioReq.puestoId &&
      this.usuarioReq.horarioId &&
      this.usuarioReq.rolId &&
      this.usuarioReq.username?.trim()
    );
  }

  cargarDatosEdicion(): void {
    if (this.isEditing && this.usuarioToEdit) {
      this.persona = {
        cui: this.usuarioToEdit.cui || this.usuarioToEdit.persona?.cui || '',
        nombres: this.usuarioToEdit.nombres || this.usuarioToEdit.persona?.nombres || '',
        apellidos: this.usuarioToEdit.apellidos || this.usuarioToEdit.persona?.apellidos || '',
        sexo: (this.usuarioToEdit.sexo || this.usuarioToEdit.persona?.sexo || 'MASCULINO') as any,
        fechaNacimiento: this.usuarioToEdit.fechaNacimiento || this.usuarioToEdit.persona?.fechaNacimiento || '',
        telefono: this.usuarioToEdit.telefono || this.usuarioToEdit.persona?.telefono || '',
        email: this.usuarioToEdit.email || this.usuarioToEdit.persona?.email || '',
      };

      const puestoIdVal = this.usuarioToEdit.puesto?.id || (this.usuarioToEdit as any).puestoId || 0;
      const horarioIdVal = this.usuarioToEdit.horario?.id || (this.usuarioToEdit as any).horarioId || 0;
      const rolIdVal = this.usuarioToEdit.rol?.id || (this.usuarioToEdit as any).rolId || 0;

      this.usuarioReq = {
        puestoId: Number(puestoIdVal),
        horarioId: Number(horarioIdVal),
        rolId: Number(rolIdVal),
        username: this.usuarioToEdit.username || '',
        estado: this.usuarioToEdit.estado ?? true,
      };
      this.cdr.detectChanges();
    }
  }

  cargarCatalogos(): void {
    this.puestoService.getPuestosActivos().subscribe({
      next: (res) => {
        this.puestos = res;
        this.cdr.detectChanges();
      }
    });

    this.horarioService.getHorarios(true).subscribe({
      next: (res) => {
        this.horarios = res;
        this.cdr.detectChanges();
      }
    });

    this.rolService.getRoles(true).subscribe({
      next: (res) => {
        this.roles = res;
        this.cdr.detectChanges();
      }
    });
  }

  aumentarContador(): void {
    if (this.puedeAvanzarPaso1 && this.contador < 1) {
      this.contador++;
    }
  }

  disminuirContador(): void {
    if (this.contador > 0) {
      this.contador--;
    }
  }

  cerrarModal(): void {
    this.modalService.close();
  }

  validarPaso1(): boolean {
    if (!this.persona.nombres?.trim()) {
      this.popUps.formIncompleto('Debe ingresar los nombres.');
      return false;
    }
    if (!this.persona.apellidos?.trim()) {
      this.popUps.formIncompleto('Debe ingresar los apellidos.');
      return false;
    }
    if (!this.persona.cui?.trim()) {
      this.popUps.formIncompleto('Debe ingresar el CUI.');
      return false;
    }
    if (!this.persona.sexo) {
      this.popUps.formIncompleto('Debe seleccionar el sexo.');
      return false;
    }
    if (!this.persona.fechaNacimiento) {
      this.popUps.formIncompleto('Debe ingresar la fecha de nacimiento.');
      return false;
    }
    if (!this.persona.telefono?.trim()) {
      this.popUps.formIncompleto('Debe ingresar un teléfono.');
      return false;
    }
    if (!/^[0-9]{8}$/.test(this.persona.telefono.trim())) {
      this.popUps.formIncompleto('El teléfono debe tener 8 dígitos.');
      return false;
    }
    return true;
  }

  validarPaso2(): boolean {
    if (!this.usuarioReq.puestoId || this.usuarioReq.puestoId === 0) {
      this.popUps.formIncompleto('Debe seleccionar un puesto.');
      return false;
    }
    if (!this.usuarioReq.horarioId || this.usuarioReq.horarioId === 0) {
      this.popUps.formIncompleto('Debe seleccionar un horario.');
      return false;
    }
    if (!this.usuarioReq.username?.trim()) {
      this.popUps.formIncompleto('Debe ingresar el nombre de usuario.');
      return false;
    }
    if (!this.usuarioReq.rolId || this.usuarioReq.rolId === 0) {
      this.popUps.formIncompleto('Debe seleccionar un rol.');
      return false;
    }

    return true;
  }

  guardarUsuario(): void {
    if (!this.puedeAvanzarPaso1) {
      this.contador = 0;
      this.popUps.formIncompleto('Completa correctamente los datos personales.');
      return;
    }
    if (!this.puedeGuardarPaso2) {
      this.popUps.formIncompleto('Completa correctamente los datos de usuario.');
      return;
    }

    const datosPersonales: PersonaDatos = {
      cui: this.persona.cui,
      nombres: this.persona.nombres,
      apellidos: this.persona.apellidos,
      sexo: this.persona.sexo,
      fechaNacimiento: this.persona.fechaNacimiento,
      telefono: this.persona.telefono?.trim() ? this.persona.telefono.trim() : undefined,
      email: this.persona.email?.trim() ? this.persona.email.trim() : undefined,
    };

    const payload: UsuarioRequest = {
      ...datosPersonales,
      persona: datosPersonales,
      puestoId: Number(this.usuarioReq.puestoId),
      horarioId: Number(this.usuarioReq.horarioId),
      rolId: Number(this.usuarioReq.rolId),
      username: this.usuarioReq.username!,
      estado: this.usuarioReq.estado ?? true,
    };

    if (this.isEditing && this.usuarioToEdit) {
      this.usuarioService.putUsuario(this.usuarioToEdit.id, payload).subscribe({
        next: () => {
          this.popUps.exito('Usuario actualizado exitosamente.');
          this.modalService.close();
          if (this.onSuccess) {
            this.onSuccess();
          }
        },
        error: (err) => {
          this.popUps.errorDesdeBackend(err, 'No se pudo actualizar el usuario.');
        }
      });
    } else {
      this.usuarioService.postUsuario(payload).subscribe({
        next: () => {
          this.popUps.exito('Usuario guardado exitosamente.');
          this.modalService.close();
          if (this.onSuccess) {
            this.onSuccess();
          }
        },
        error: (err) => {
          this.popUps.errorDesdeBackend(err, 'No se pudo guardar el usuario.');
        }
      });
    }
  }
}
