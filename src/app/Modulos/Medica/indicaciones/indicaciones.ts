import { Component } from '@angular/core';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import { IndicacionCuidados } from './cuidados/indicacion-cuidados';
import { IndicacionExamenes } from './examenes/indicacion-examenes';
import { IndicacionMedicamentos } from './medicamentos/indicacion-medicamentos';

/** Secciones del rail de indicaciones: medicamentos, exámenes y cuidados. */
type SeccionIndicacion = 'medicamentos' | 'examenes' | 'cuidados';

interface SeccionVista {
  id: SeccionIndicacion;
  titulo: string;
  icono: string;
  /** Secciones que la maqueta tiene desarrolladas; las pendientes se listan pero no se abren. */
  desarrollada: boolean;
}

/**
 * Indicaciones médicas del episodio: pantalla del módulo Médico que reúne las indicaciones de
 * medicamentos, de exámenes y los cuidados del paciente. El rail de secciones muestra la estructura
 * completa del submenú y conmuta el área central entre las secciones.
 */
@Component({
  selector: 'app-indicaciones',
  imports: [DatosPaciente, IndicacionMedicamentos, IndicacionExamenes, IndicacionCuidados],
  templateUrl: './indicaciones.html',
  styleUrl: './indicaciones.scss',
})
export class Indicaciones {
  // ------------------- ESTADO DE LA VISTA -------------------
  /** Sección del rail que se muestra en el área central: su registro y su listado. */
  seccionActiva: SeccionIndicacion = 'medicamentos';

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Secciones del rail de indicaciones; las tres están desarrolladas en la maqueta. */
  secciones: SeccionVista[] = [
    {
      id: 'medicamentos',
      titulo: 'Medicamentos',
      icono: 'bi-capsule',
      desarrollada: true,
    },
    {
      id: 'examenes',
      titulo: 'Exámenes',
      icono: 'bi-clipboard2-pulse',
      desarrollada: true,
    },
    {
      id: 'cuidados',
      titulo: 'Cuidados',
      icono: 'bi-heart-pulse',
      desarrollada: true,
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- ACCIONES DE LA VISTA -------------------
  /**
   * Muestra la sección pulsada del rail y repliega lo que quede desplegado en la sección anterior.
   * La ficha con los datos del paciente es común a las tres secciones, así que no se toca.
   */
  seleccionarSeccion(id: SeccionIndicacion): void {
    this.seccionActiva = id;
  }

  /**
   * Abre o cierra la ficha con los datos del paciente desde la pestaña lateral del bloque
   * compartido, igual que en evaluación clínica. Al abrirla se muestran los datos completos para
   * que el usuario vea la información de contexto aunque la hubiera plegado antes.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }
}
