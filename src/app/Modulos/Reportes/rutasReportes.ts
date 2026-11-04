import { Routes } from '@angular/router';
import { ReporteFarmacia } from './reporte-farmacia/reporte-farmacia';
import { ReportePacientes } from './reporte-pacientes/reporte-pacientes';
import { ReporteMedica } from './reporte-medica/reporte-medica';
import { ReporteEnfermeria } from './reporte-enfermeria/reporte-enfermeria';
import { ReporteUsuarios } from './reporte-usuarios/reporte-usuarios';
import { BitacoraPacientes } from './bitacora-pacientes/bitacora-pacientes';
import { BitacoraGeneral } from './bitacora-general/bitacora-general';

export const rutasReportes: Routes = [
  { path: '', redirectTo: 'farmacia', pathMatch: 'full' },
  { path: 'farmacia', component: ReporteFarmacia, data: { submodulo: 'REPORTES-FARMACIA' } },
  { path: 'pacientes', component: ReportePacientes, data: { submodulo: 'REPORTES-PACIENTES' } },
  { path: 'medica', component: ReporteMedica, data: { submodulo: 'REPORTES-MEDICA' } },
  { path: 'enfermeria', component: ReporteEnfermeria, data: { submodulo: 'REPORTES-ENFERMERIA' } },
  { path: 'usuarios', component: ReporteUsuarios, data: { submodulo: 'REPORTES-USUARIOS' } },
  {
    path: 'bitacora-pacientes',
    component: BitacoraPacientes,
    data: { submodulo: 'REPORTES-BITACORA-PACIENTES' },
  },
  {
    path: 'bitacora-general',
    component: BitacoraGeneral,
    data: { submodulo: 'REPORTES-BITACORA-GENERAL' },
  },
];
