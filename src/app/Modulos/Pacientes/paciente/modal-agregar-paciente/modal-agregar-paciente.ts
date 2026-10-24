import { ChangeDetectorRef, Component, DestroyRef, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { concatMap, finalize, tap, Observable, TimeoutError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { ArchivoService } from '../../../../shared/archivos/archivoService';
import { PersonaDatos, Sexo } from '../../../Usuarios/usu/data/usuarioInterfaz';
import {
  EstadoCivil,
  MedicoDatos,
  PacienteActualizacionRequest,
  PacienteDatos,
  PacienteDetalle,
  PacienteRequest,
  PacienteResumido,
} from '../data/pacienteInterfaz';
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
  @Input() isEditing = false;
  @Input() pacienteId: number | null = null;
  @Input() datosEdicion: PacienteDetalle | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private pacienteService: PacienteService,
    private usuarioService: UsuarioService,
    private servicioCama: ServicioCama,
    private servicioCatalogo: CatalogoService,
    private modalService: ModalService,
    private popUps: ModalPopUps,
    private archivoService: ArchivoService,
    private cdr: ChangeDetectorRef,
  ) {}

  contador = 0;
  tipoAtencion: 'emergencia' | 'hospitalizacion' = 'emergencia';
  busquedaPaciente = '';
  soloDatosPersonales = false;

  // ------------------- BÚSQUEDA DE PACIENTE -------------------
  modoBusqueda = false;
  buscandoPacientes = false;
  errorBusqueda = '';
  resultadosBusqueda: PacienteResumido[] = [];
  cargandoPrecarga = false;

  private pacienteIdSeleccionado: number | null = null;
  private parentescoSeleccionadoNombre: string | null = null;
  private solicitudBusqueda = 0;

  pasos: string[] = [
    'Información del paciente',
    'Enfermedades y alergias',
    'Tipo de atención',
    'Información de responsable',
    'Referencia',
  ];

  protected get archivosAceptados(): string {
    return this.archivoService.aceptados;
  }

  // ----------------------- carga de inicio.------------------
  ngOnInit() {
    this.precargarFormulario();
    if (!this.soloDatosPersonales) {
      this.llenarSelects();
    }
  }

  // ----------------------- ALIMENTAR SELECTS ------------------------

  medicos: MedicoDatos[] = [];
  camas: camaResponseSimple[] = [];
  parentesco: Inter_base[] = [];  //
  insituciones: Inter_institucion[] = [];
  enfermedades: Inter_base[] = [];
  alergias: Inter_base[] = [];
  enfermedadesSeleccionadas: number[] = [];
  alergiasSeleccionadas: number[] = [];

  llenarSelects(){
    this.cargarParentescos();
    this.cargarInstituciones();
    this.cargarCamas();
    this.cargarMedicos();
    this.cargarEnfermedades();
    this.cargarAlergias();
  }

  cargarMedicos() {
    this.usuarioService.getMedicos().subscribe({
      next: (medicos) => {
        this.medicos = medicos;
        this.seleccionarMedicoEdicion();
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar los médicos.'),
    });
  }

  cargarCamas(){
    const peticion = this.isEditing
      ? this.servicioCama.listarCamas(true)
      : this.servicioCama.buscarCamas(EstadoCama.DISPONIBLE, true);

    peticion.subscribe({
      next: (camas) => {
        if (this.isEditing && this.datosEdicion) {
          const camaActual = this.datosEdicion.camaId;
          const seleccionables = camas.filter(
            (cama) => cama.estado === EstadoCama.DISPONIBLE || cama.idCama === camaActual,
          );

          if (camaActual != null && !seleccionables.some((cama) => cama.idCama === camaActual)) {
            seleccionables.push({
              idCama: camaActual,
              codigo: this.datosEdicion.camaCodigo ?? '—',
              estado: EstadoCama.OCUPADA,
              nombreHabitacion: '',
              nombreTipoCama: '',
              nombreArea: '',
              activo: true,
            });
          }

          this.camas = seleccionables;
          this.camaSeleccionada =
            this.camas.find((cama) => cama.idCama === camaActual) ?? null;
          this.cdr.detectChanges();
          return;
        }

        this.camas = camas;
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las camas.'),
    });
  }

  cargarParentescos() {
    this.servicioCatalogo.listar<Inter_base>('parentescos').subscribe({
      next: (parentescos) => {
        this.parentesco = parentescos;
        this.agregarParentescoSiFalta();
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar los parentescos.'),
    });
  }

  cargarInstituciones() {
    this.servicioCatalogo.listar<Inter_institucion>('instituciones').subscribe({
      next: (instituciones) => {
        this.insituciones = instituciones;
        this.seleccionarInstitucionEdicion();
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las instituciones.'),
    });
  }

  cargarEnfermedades() {
    this.servicioCatalogo.listar<Inter_base>('enfermedades').subscribe({
      next: (enfermedades) => {
        this.enfermedades = enfermedades;
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las enfermedades.'),
    });
  }

  cargarAlergias() {
    this.servicioCatalogo.listar<Inter_base>('alergias').subscribe({
      next: (alergias) => {
        this.alergias = alergias;
        this.cdr.detectChanges();
      },
      error: (error) => this.popUps.errorDesdeBackend(error, 'No se pudieron cargar las alergias.'),
    });
  }

  // ----------------------- PRECARGA DE EDICIÓN -----------------------
  private precargarFormulario(): void {
    if (!this.isEditing || !this.datosEdicion) return;

    const datos = this.datosEdicion;

    this.pacienteForm.persona = {
      cui: datos.cui ?? '',
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      sexo: datos.sexo ?? undefined,
      fechaNacimiento: datos.fechaNacimiento ?? '',
      telefono: datos.telefono ?? '',
      email: datos.email,
    };
    this.pacienteForm.estadoCivil = datos.estadoCivil ?? '';
    this.pacienteForm.direccion = datos.direccion ?? '';
    this.pacienteForm.ocupacion = datos.ocupacion ?? '';
    this.alergiasSeleccionadas = datos.alergias.map((alergia) => alergia.id);
    this.enfermedadesSeleccionadas = datos.enfermedades.map((enfermedad) => enfermedad.id);

    if (datos.tipoAtencion) {
      this.tipoAtencion = datos.tipoAtencion === 'HOSPITALIZACION' ? 'hospitalizacion' : 'emergencia';
    }
    this.descripcionAtencion = datos.descripcion ?? '';
    this.motivoReferencia = datos.referencia?.motivoReferencia ?? '';

    if (datos.responsable) {
      this.responsableForm.persona = {
        cui: datos.responsable.cui ?? '',
        nombres: datos.responsable.nombres,
        apellidos: datos.responsable.apellidos,
        sexo: datos.responsable.sexo ?? undefined,
        fechaNacimiento: datos.responsable.fechaNacimiento ?? '',
        telefono: datos.responsable.telefono ?? '',
      };
      this.responsableForm.parentescoId = datos.responsable.parentescoId;
      this.responsableForm.direccion = datos.responsable.direccion ?? '';
      this.parentescoSeleccionadoNombre = datos.responsable.parentescoNombre;
    }

    this.soloDatosPersonales = !datos.episodioId;
    if (this.soloDatosPersonales) {
      this.pasos = ['Información del paciente'];
    }

    this.seleccionarMedicoEdicion();
    this.seleccionarInstitucionEdicion();
  }

  private seleccionarMedicoEdicion(): void {
    if (!this.isEditing || !this.datosEdicion?.medicoId) return;

    const id = this.datosEdicion.medicoId;
    let medico = this.medicos.find((item) => item.id === id) ?? null;

    if (!medico) {
      medico = {
        id,
        nombreCompleto: this.datosEdicion.medicoNombre ?? '—',
        especialidad: '',
      };
      this.medicos = [...this.medicos, medico];
    }

    this.medicoSeleccionado = medico;
  }

  private seleccionarInstitucionEdicion(): void {
    if (!this.isEditing || !this.datosEdicion?.referencia?.institucionId) return;

    const id = this.datosEdicion.referencia.institucionId;
    let institucion = this.insituciones.find((item) => item.id === id) ?? null;

    if (!institucion) {
      institucion = {
        id,
        nombre: this.datosEdicion.referencia.institucionNombre ?? '—',
        direccion: '',
        telefono: '',
      };
      this.insituciones = [...this.insituciones, institucion];
    }

    this.institucionSeleccionada = institucion;
  }

  cambiarTipoAtencion(emergencia: boolean): void {
    this.tipoAtencion = emergencia ? 'emergencia' : 'hospitalizacion';
    if (emergencia) {
      this.camaSeleccionada = null;
    }
  }

  // ----------------------- BÚSQUEDA DE PACIENTE -----------------------
  buscarPaciente(): void {
    const texto = this.busquedaPaciente.trim();
    this.modoBusqueda = true;
    this.errorBusqueda = '';
    this.resultadosBusqueda = [];

    if (!texto) {
      this.buscandoPacientes = false;
      this.cdr.detectChanges();
      return;
    }

    this.buscandoPacientes = true;
    const version = ++this.solicitudBusqueda;
    this.cdr.detectChanges();

    this.pacienteService
      .buscarPacientes(texto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pacientes) => {
          if (version !== this.solicitudBusqueda) return;
          this.resultadosBusqueda = pacientes;
          this.buscandoPacientes = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (version !== this.solicitudBusqueda) return;
          this.buscandoPacientes = false;
          this.errorBusqueda = 'No se pudo realizar la búsqueda. Intente nuevamente.';
          this.cdr.detectChanges();
        },
      });
  }

  cancelarBusqueda(): void {
    this.solicitudBusqueda += 1;
    this.modoBusqueda = false;
    this.buscandoPacientes = false;
    this.errorBusqueda = '';
    this.resultadosBusqueda = [];
    this.cdr.detectChanges();
  }

  protected sexoLegible(sexo: Sexo | null): string {
    if (!sexo) return 'Sin sexo';
    return sexo === 'MASCULINO' ? 'Masculino' : 'Femenino';
  }

  seleccionarPacienteBusqueda(paciente: PacienteResumido): void {
    this.solicitudBusqueda += 1;
    this.modoBusqueda = false;
    this.buscandoPacientes = false;
    this.errorBusqueda = '';
    this.resultadosBusqueda = [];
    this.cargandoPrecarga = true;
    this.limpiarFormularioPrecarga();
    this.cdr.detectChanges();

    this.pacienteService
      .obtenerPaciente(paciente.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.pacienteIdSeleccionado = detalle.pacienteId;
          this.precargarPacienteSeleccionado(detalle);
          this.cargandoPrecarga = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.cargandoPrecarga = false;
          this.cdr.detectChanges();
          this.popUps.errorDesdeBackend(
            error,
            'No se pudieron cargar los datos del paciente.',
          );
        },
      });
  }

  private limpiarFormularioPrecarga(): void {
    this.pacienteForm = {
      persona: this.nuevaPersonaFormulario(),
      estadoCivil: '',
      direccion: '',
      ocupacion: '',
    };
    this.responsableForm = {
      persona: this.nuevaPersonaFormulario(),
      parentescoId: null,
      direccion: '',
    };
    this.parentescoSeleccionadoNombre = null;
    this.tipoAtencion = 'emergencia';
    this.descripcionAtencion = '';
    this.medicoSeleccionado = null;
    this.camaSeleccionada = null;
    this.institucionSeleccionada = null;
    this.motivoReferencia = '';
    this.archivoReferencia = null;
    this.contador = 0;
    this.enfermedadesSeleccionadas = [];
    this.alergiasSeleccionadas = [];
  }

  private precargarPacienteSeleccionado(detalle: PacienteDetalle): void {
    this.pacienteForm.persona = {
      cui: detalle.cui ?? '',
      nombres: detalle.nombres,
      apellidos: detalle.apellidos,
      sexo: detalle.sexo ?? undefined,
      fechaNacimiento: detalle.fechaNacimiento ?? '',
      telefono: detalle.telefono ?? '',
      email: detalle.email,
    };
    this.pacienteForm.estadoCivil = detalle.estadoCivil ?? '';
    this.pacienteForm.direccion = detalle.direccion ?? '';
    this.pacienteForm.ocupacion = detalle.ocupacion ?? '';
    this.alergiasSeleccionadas = detalle.alergias.map((alergia) => alergia.id);
    this.enfermedadesSeleccionadas = detalle.enfermedades.map((enfermedad) => enfermedad.id);

    const responsable = detalle.responsable;
    if (!responsable) {
      this.responsableForm = {
        persona: this.nuevaPersonaFormulario(),
        parentescoId: null,
        direccion: '',
      };
      this.parentescoSeleccionadoNombre = null;
    } else {
      this.responsableForm.persona = {
        cui: responsable.cui ?? '',
        nombres: responsable.nombres,
        apellidos: responsable.apellidos,
        sexo: responsable.sexo ?? undefined,
        fechaNacimiento: responsable.fechaNacimiento ?? '',
        telefono: responsable.telefono ?? '',
      };
      this.responsableForm.parentescoId = responsable.parentescoId;
      this.responsableForm.direccion = responsable.direccion ?? '';
      this.parentescoSeleccionadoNombre = responsable.parentescoNombre;
      this.agregarParentescoSiFalta();
    }

    this.busquedaPaciente = '';
  }

  private agregarParentescoSiFalta(): void {
    const id = this.responsableForm.parentescoId;
    if (id == null || this.parentesco.some((item) => item.id === id)) return;

    this.parentesco = [
      ...this.parentesco,
      { id, nombre: this.parentescoSeleccionadoNombre ?? '—' },
    ];
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


    async guardarPaciente(): Promise<void> {
      const request = this.validarPaciente();
      if (!request) return;

      if (this.isEditing) {
        const confirmado = await this.popUps.confirmarToast(
          '¿Guardar los cambios del paciente?',
        );
        if (!confirmado) return;
      }

      this.guardando = true;
      this.cdr.detectChanges();
      const mensajeExito = this.isEditing
        ? 'Paciente actualizado correctamente.'
        : 'Paciente guardado exitosamente.';

      const peticion$: Observable<unknown> = this.isEditing
        ? this.pacienteService.actualizarPaciente(this.pacienteId!, {
            request,
            archivoReferencia: this.archivoReferencia,
          })
        : this.pacienteService.postPaciente({
            request: { paciente: request.paciente, episodio: request.episodio! },
            archivoReferencia: this.archivoReferencia,
          });

      // El servicio envía el JSON en request y el archivo como parte multipart separada.
      peticion$
        .pipe(
          concatMap(() => this.popUps.exito(mensajeExito, '¡Éxito!', 1800)),
          tap(() => this.onSuccess?.()),
          tap(() => this.modalService.close()),
          finalize(() => {
            this.guardando = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
        error: (error) => {
          if (error instanceof TimeoutError) {
            this.popUps.error(
              'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
            );
            return;
          }
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

    private validarPaciente(): PacienteActualizacionRequest | null {
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

    const camaId = this.tipoAtencion === 'hospitalizacion'
      ? this.camaSeleccionada?.idCama ?? null
      : null;

    const pacienteId = this.isEditing ? this.pacienteId : this.pacienteIdSeleccionado;
    const pacienteDatos: PacienteDatos = {
      pacienteId,
      persona: {
        cui: cuiPaciente || null,
        nombres: nombresPaciente,
        apellidos: apellidosPaciente,
        fechaNacimiento: fechaNacimientoPaciente,
        sexo: paciente.sexo,
        telefono: telefonoPaciente || null,
        email: paciente.email ?? null,
      },
      estadoCivil: this.pacienteForm.estadoCivil || null,
      direccion: this.pacienteForm.direccion.trim() || null,
      ocupacion: this.pacienteForm.ocupacion.trim() || null,
      camaId,
      alergiaIds: [...this.alergiasSeleccionadas],
      enfermedadIds: [...this.enfermedadesSeleccionadas],
    };

    // Un paciente sin episodio activo solo puede actualizar sus datos personales.
    if (this.soloDatosPersonales) {
      return { paciente: pacienteDatos, episodio: null };
    }

    const medicoId = this.medicoSeleccionado?.id;
    const descripcion = this.descripcionAtencion.trim();

    // Paso 3: médico y descripción siempre; cama solo para hospitalización.
    if (medicoId == null || !descripcion) {
      this.contador = 2;
      this.popUps.formIncompleto('Selecciona un médico e ingresa la descripción de la atención.');
      return null;
    }
    if (this.tipoAtencion === 'hospitalizacion' && camaId == null) {
      this.contador = 2;
      this.popUps.formIncompleto('Selecciona una cama para la hospitalización.');
      return null;
    }

    const responsable = this.responsableForm;
    const datosResponsable = responsable.persona;
    const parentescoId = responsable.parentescoId;
    let responsableRequest: PacienteRequest['episodio']['responsable'] = null;

    // Paso 4: siempre aplica en hospitalización y en emergencia con paciente menor de edad.
    // Si es opcional pero se empezó a llenar, se exige el mismo conjunto completo de datos.
    if (this.responsableCamposRequeridos) {
      const nombres = datosResponsable.nombres?.trim() ?? '';
      const apellidos = datosResponsable.apellidos?.trim() ?? '';
      const fechaNacimiento = datosResponsable.fechaNacimiento ?? '';
      const cui = datosResponsable.cui?.trim() ?? '';
      const telefono = datosResponsable.telefono?.trim() ?? '';

      if (!nombres || !apellidos || !fechaNacimiento || !datosResponsable.sexo || !cui || !telefono || parentescoId == null) {
        this.contador = 3;
        this.popUps.formIncompleto('Completa nombre, apellidos, nacimiento, sexo, CUI, teléfono y parentesco del responsable.');
        return null;
      }

      if (!/^\d{13}$/.test(cui)) {
        this.contador = 3;
        this.popUps.formIncompleto('El CUI del responsable debe contener exactamente 13 dígitos.');
        return null;
      }
      if (!/^\d{8}$/.test(telefono)) {
        this.contador = 3;
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

    // Paso 5: la referencia es opcional; si hay motivo o archivo, sí debe indicarse institución.
    if (hayReferencia && institucionId == null) {
      this.contador = 4;
      this.popUps.formIncompleto('Selecciona la institución que refiere.');
      return null;
    }

    return {
      paciente: pacienteDatos,
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

  protected get nombresAlergiasSeleccionadas(): string {
    return this.nombresSeleccionados(this.alergiasSeleccionadas, this.alergias);
  }

  protected get nombresEnfermedadesSeleccionadas(): string {
    return this.nombresSeleccionados(this.enfermedadesSeleccionadas, this.enfermedades);
  }

  private nombresSeleccionados(ids: number[], catalogo: Inter_base[]): string {
    return ids
      .map((id) => catalogo.find((item) => item.id === id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre))
      .join(', ');
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
    const resultado = this.archivoService.procesarArchivo(input.files?.[0] ?? null);

    if (resultado.mensaje) {
      this.popUps.advertencia(resultado.mensaje);
      input.value = '';
      return;
    }

    this.archivoReferencia = resultado.seleccionado?.archivo ?? null;
  }

  soltarArchivo(event: DragEvent): void {
    event.preventDefault();
    if (!this.institucionSeleccionada || this.guardando) return;

    const resultado = this.archivoService.procesarArchivo(event.dataTransfer?.files[0] ?? null);

    if (resultado.mensaje) {
      this.popUps.advertencia(resultado.mensaje);
      return;
    }

    this.archivoReferencia = resultado.seleccionado?.archivo ?? null;
  }

  quitarArchivo(input: HTMLInputElement): void {
    this.archivoReferencia = null;
    input.value = '';
  }
}
