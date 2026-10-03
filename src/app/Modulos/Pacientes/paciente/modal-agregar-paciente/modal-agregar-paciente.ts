import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { concatMap, finalize, tap } from 'rxjs';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { PersonaDatos } from '../../../Usuarios/usu/data/usuarioInterfaz';
import { EstadoCivil, MedicoDatos, PacienteRequest } from '../data/pacienteInterfaz';
import { PacienteService } from '../data/paciente-service';
import { UsuarioService } from '../../../Usuarios/usu/data/usuario-service';
import { ServicioCama } from '../../camas/data/servicioCama';
import { camaResponseSimple, EstadoCama } from '../../camas/data/interfazCama';
import { Inter_base, Inter_institucion } from '../../../Catalogos/data/nombreInterfaz';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';

@Component({
  selector: 'app-modal-agregar-paciente',
  imports: [CampoValidado, FormsModule, MatSelectModule, TabSwitch],
  templateUrl: './modal-agregar-paciente.html',
  styleUrl: './modal-agregar-paciente.scss',
})
export class ModalAgregarPaciente {
  @Input() onSuccess?: () => void;

  constructor(
    private pacienteService: PacienteService,
    private usuarioService: UsuarioService,
    private servicioCama: ServicioCama,
    private servicioCatalogo: CatalogoService,
    private modalService: ModalService,
    private popUps: ModalPopUps,
  ) {}

  contador = 0;
  tipoAtencion: 'emergencia' | 'hospitalizacion' = 'emergencia';
  busquedaPaciente = '';

  pasos = [
    'Información del paciente',
    'Tipo de atención',
    'Información de responsable',
    'Referencia',
  ];

  // ----------------------- carga de inicio.------------------
  ngOnInit() {
    this.llenarSelects();
  }

  // ----------------------- ALIMENTAR SELECTS ------------------------

  medicos: MedicoDatos[] = [];
  camas: camaResponseSimple[] = [];
  parentesco: Inter_base[] = [];  //
  insituciones: Inter_institucion[] = [];

  llenarSelects(){
    this.cargarParentescos();
    this.cargarInstituciones();
    this.cargarCamas();
    this.cargarMedicos();
  }

  cargarMedicos() {
    this.usuarioService.getMedicos().subscribe({
      next: (medicos) => {
        this.medicos = medicos;
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar los médicos.'),
    });
  }

  cargarCamas(){
    this.servicioCama.buscarCamas(EstadoCama.DISPONIBLE, true).subscribe({
      next: (camas) => {
        this.camas = camas;
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las camas.'),
    });
  }

  cargarParentescos() {
    this.servicioCatalogo.listar<Inter_base>('parentescos').subscribe({
      next: (parentescos) => {
        this.parentesco = parentescos;
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar los parentescos.'),
    });
  }

  cargarInstituciones() {
    this.servicioCatalogo.listar<Inter_institucion>('instituciones').subscribe({
      next: (instituciones) => {
        this.insituciones = instituciones;
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las instituciones.'),
    });
  }

  // ------------------------ GUARDAR PACIENTE ------------------------
    medicoSeleccionado: MedicoDatos | null = null;
    institucionSeleccionada: Inter_institucion | null = null;
    camaSeleccionada: camaResponseSimple | null = null;
    archivoReferencia: File | null = null;
    descripcionAtencion = '';
    motivoReferencia = '';
    guardando = false;

    pacienteForm = {
      persona: this.nuevaPersonaFormulario(),
      estadoCivil: '' as EstadoCivil | '',
      direccion: '',
      ocupacion: '',
    };

    responsableForm = {
      persona: this.nuevaPersonaFormulario(),
      parentescoId: null as number | null,
      direccion: '',
    };

    private nuevaPersonaFormulario(): Partial<PersonaDatos> {
      return {
        cui: '',
        nombres: '',
        apellidos: '',
        fechaNacimiento: '',
        telefono: '',
      };
    }


    guardarPaciente(): void {
      const request = this.validarPaciente();
      if (!request) return;

      this.guardando = true;
      // El servicio envía el JSON en request y el archivo como parte multipart separada.
      this.pacienteService.postPaciente({ request, archivoReferencia: this.archivoReferencia })
        .pipe(
          concatMap(() => this.popUps.exito('Paciente guardado exitosamente.', '¡Éxito!', 1800)),
          tap(() => this.onSuccess?.()),
          tap(() => this.modalService.close()),
          finalize(() => this.guardando = false),
        )
        .subscribe({
        error: (error) => {
          this.popUps.errorDesdeBackend(error, 'No se pudo guardar el paciente.');
        },
      });
    }


  //------------------------- VALIDACIONES----------------------
    private esPacienteMenor(): boolean {
      const fechaNacimiento = this.pacienteForm.persona.fechaNacimiento;
      if (!fechaNacimiento) return false;

      const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      if (
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
      ) {
        edad--;
      }
      return edad < 18;
    }

    private validarPaciente(): PacienteRequest | null {
    const paciente = this.pacienteForm.persona;
    const nombresPaciente = paciente.nombres?.trim() ?? '';
    const apellidosPaciente = paciente.apellidos?.trim() ?? '';
    const fechaNacimientoPaciente = paciente.fechaNacimiento ?? '';
    const cuiPaciente = paciente.cui?.trim() ?? '';
    const telefonoPaciente = paciente.telefono?.trim() ?? '';

    // Paso 1: nombre, apellidos, sexo y nacimiento son obligatorios; el resto puede omitirse.
    if (!nombresPaciente || !apellidosPaciente || !paciente.sexo || !fechaNacimientoPaciente) {
      this.contador = 0;
      this.popUps.formIncompleto('Completa nombres, apellidos, sexo y fecha de nacimiento del paciente.');
      return null;
    }

    if (cuiPaciente && !/^\d{13}$/.test(cuiPaciente)) {
      this.contador = 0;
      this.popUps.formIncompleto('El CUI del paciente debe contener exactamente 13 dígitos.');
      return null;
    }
    if (telefonoPaciente && !/^\d{8}$/.test(telefonoPaciente)) {
      this.contador = 0;
      this.popUps.formIncompleto('El teléfono del paciente debe contener exactamente 8 dígitos.');
      return null;
    }

    const medicoId = this.medicoSeleccionado?.id;
    const camaId = this.camaSeleccionada?.idCama;
    const descripcion = this.descripcionAtencion.trim();

    // Paso 2: médico y descripción siempre; cama solo para hospitalización.
    if (medicoId == null || !descripcion) {
      this.contador = 1;
      this.popUps.formIncompleto('Selecciona un médico e ingresa la descripción de la atención.');
      return null;
    }
    if (this.tipoAtencion === 'hospitalizacion' && camaId == null) {
      this.contador = 1;
      this.popUps.formIncompleto('Selecciona una cama para la hospitalización.');
      return null;
    }

    const responsable = this.responsableForm;
    const datosResponsable = responsable.persona;
    const parentescoId = responsable.parentescoId;
    let responsableRequest: PacienteRequest['episodio']['responsable'] = null;

    // Paso 3: siempre aplica en hospitalización y en emergencia con paciente menor de edad.
    // Si es opcional pero se empezó a llenar, se exige el mismo conjunto completo de datos.
    if (this.responsableCamposRequeridos) {
      const nombres = datosResponsable.nombres?.trim() ?? '';
      const apellidos = datosResponsable.apellidos?.trim() ?? '';
      const fechaNacimiento = datosResponsable.fechaNacimiento ?? '';
      const cui = datosResponsable.cui?.trim() ?? '';
      const telefono = datosResponsable.telefono?.trim() ?? '';

      if (!nombres || !apellidos || !fechaNacimiento || !datosResponsable.sexo || !cui || !telefono || parentescoId == null) {
        this.contador = 2;
        this.popUps.formIncompleto('Completa nombre, apellidos, nacimiento, sexo, CUI, teléfono y parentesco del responsable.');
        return null;
      }

      if (!/^\d{13}$/.test(cui)) {
        this.contador = 2;
        this.popUps.formIncompleto('El CUI del responsable debe contener exactamente 13 dígitos.');
        return null;
      }
      if (!/^\d{8}$/.test(telefono)) {
        this.contador = 2;
        this.popUps.formIncompleto('El teléfono del responsable debe contener exactamente 8 dígitos.');
        return null;
      }

      responsableRequest = {
        persona: {
          cui,
          nombres,
          apellidos,
          fechaNacimiento,
          sexo: datosResponsable.sexo,
          telefono,
        },
        parentescoId,
        direccion: responsable.direccion.trim() || null,
      };
    }

    const motivoReferencia = this.motivoReferencia.trim();
    const institucionId = this.institucionSeleccionada?.id;
    const hayReferencia = this.referenciaTieneDatos;

    // Paso 4: la referencia es opcional; si hay motivo o archivo, sí debe indicarse institución.
    if (hayReferencia && institucionId == null) {
      this.contador = 3;
      this.popUps.formIncompleto('Selecciona la institución que refiere.');
      return null;
    }

    return {
      paciente: {
        persona: {
          cui: cuiPaciente || null,
          nombres: nombresPaciente,
          apellidos: apellidosPaciente,
          fechaNacimiento: fechaNacimientoPaciente,
          sexo: paciente.sexo,
          telefono: telefonoPaciente || null,
          email: null,
        },
        estadoCivil: this.pacienteForm.estadoCivil || null,
        direccion: this.pacienteForm.direccion.trim() || null,
        ocupacion: this.pacienteForm.ocupacion.trim() || null,
      },
      episodio: {
        tipoAtencion: this.tipoAtencion === 'emergencia' ? 'EMERGENCIA' : 'HOSPITALIZACION',
        descripcion,
        medicoId,
        responsable: responsableRequest,
        referencia: hayReferencia ? { institucionId: institucionId!, motivoReferencia: motivoReferencia || null } : null,
      },
    };
  }

  // Valida si una cadena contiene solo dígitos y tiene la longitud especificada.
  private esDigitosValidos(valor: string | null | undefined, longitud: number): boolean {
    return !valor?.trim() || new RegExp(`^\\d{${longitud}}$`).test(valor.trim());
  }

  // ------------------- ACCIONES DE MODAL -------------------
  cerrarModal(): void {
    this.modalService.close();
  }

  // ------------------- GETTERS PARA VALIDACIONES -------------------
  get responsableRequerido(): boolean {
    return this.tipoAtencion === 'hospitalizacion' || this.esPacienteMenor();
  }

  get responsableCamposRequeridos(): boolean {
    const persona = this.responsableForm.persona;
    return this.responsableRequerido || Boolean(
      persona.nombres?.trim() ||
      persona.apellidos?.trim() ||
      persona.fechaNacimiento ||
      persona.sexo ||
      persona.cui?.trim() ||
      persona.telefono?.trim() ||
      this.responsableForm.parentescoId != null ||
      this.responsableForm.direccion.trim(),
    );
  }

  get referenciaTieneDatos(): boolean {
    return Boolean(this.institucionSeleccionada || this.motivoReferencia.trim() || this.archivoReferencia);
  }
  
  get puedeAvanzarPaso1(): boolean {
    const persona = this.pacienteForm.persona;
    return Boolean(
      persona.nombres?.trim() &&
      persona.apellidos?.trim() &&
      persona.sexo &&
      persona.fechaNacimiento &&
      this.esDigitosValidos(persona.cui, 13) &&
      this.esDigitosValidos(persona.telefono, 8)
    );
  }
  
  get puedeAvanzarPaso2(): boolean {
    return Boolean(
      this.medicoSeleccionado?.id != null &&
      this.descripcionAtencion.trim() &&
      (this.tipoAtencion !== 'hospitalizacion' || this.camaSeleccionada?.idCama != null)
    );
  }
  
  get puedeAvanzarPaso3(): boolean {
    if (!this.responsableCamposRequeridos) return true;
  
    const persona = this.responsableForm.persona;
    return Boolean(
      persona.nombres?.trim() &&
      persona.apellidos?.trim() &&
      persona.fechaNacimiento &&
      persona.sexo &&
      this.esDigitosValidos(persona.cui, 13) &&
      this.esDigitosValidos(persona.telefono, 8) &&
      this.responsableForm.parentescoId != null
    );
  }

  // ------------------ HELPERS PARA HTML -------------------- 
  // evita escribir letras en el input, y restringe la longitud a la indicada
  filtrarDigitos(event: Event, longitud: number): string {
    const input = event.target as HTMLInputElement;
    const valorFiltrado = input.value.replace(/\D/g, '').slice(0, longitud);
    input.value = valorFiltrado;
    return valorFiltrado;
  }

  // ----------------- HELPERS PARA ARCHIVOS -------------------- 
  seleccionarArchivo(event: Event): void {
    if (!this.institucionSeleccionada || this.guardando) return;

    const input = event.target as HTMLInputElement;
    this.archivoReferencia = input.files?.[0] ?? null;
  }

  soltarArchivo(event: DragEvent): void {
    event.preventDefault();
    if (!this.institucionSeleccionada || this.guardando) return;

    this.archivoReferencia = event.dataTransfer?.files[0] ?? null;
  }

  quitarArchivo(input: HTMLInputElement): void {
    this.archivoReferencia = null;
    input.value = '';
  }
}
