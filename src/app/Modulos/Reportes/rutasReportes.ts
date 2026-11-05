import { Routes } from '@angular/router';
import { ReporteConteo } from './reporte-conteo/reporte-conteo';
import { ReporteCenso } from './reporte-censo/reporte-censo';
import { ReporteProveedores } from './reporte-proveedores/reporte-proveedores';
import { ReporteStock } from './reporte-stock/reporte-stock';
import { ReporteVencimientos } from './reporte-vencimientos/reporte-vencimientos';
import { ReporteMonitoreo } from './reporte-monitoreo/reporte-monitoreo';
import { ReporteGlucosa } from './reporte-glucosa/reporte-glucosa';
import { BitacoraPacientes } from './bitacora-pacientes/bitacora-pacientes';
import { BitacoraGeneral } from './bitacora-general/bitacora-general';

export const rutasReportes: Routes = [
  { path: '', redirectTo: 'farmacia/mas-vendidos', pathMatch: 'full' },

  // Farmacia
  {
    path: 'farmacia/mas-vendidos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-FARMACIA',
      reporte: {
        clave: 'masVendidos',
        titulo: 'Medicamentos más vendidos',
        etiquetaColumna: 'Medicamento',
        etiquetaValor: 'Cantidad',
        conGrafica: true,
        graficaTitulo: 'Medicamentos más vendidos',
      },
    },
  },
  {
    path: 'farmacia/menos-vendidos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-FARMACIA',
      reporte: {
        clave: 'menosVendidos',
        titulo: 'Medicamentos menos vendidos',
        etiquetaColumna: 'Medicamento',
        etiquetaValor: 'Cantidad',
        conGrafica: true,
        graficaTitulo: 'Medicamentos menos vendidos',
      },
    },
  },
  {
    path: 'farmacia/vencimientos',
    component: ReporteVencimientos,
    data: { submodulo: 'REPORTES-FARMACIA' },
  },
  {
    path: 'farmacia/proveedores',
    component: ReporteProveedores,
    data: { submodulo: 'REPORTES-FARMACIA' },
  },
  {
    path: 'farmacia/stock',
    component: ReporteStock,
    data: { submodulo: 'REPORTES-FARMACIA' },
  },

  // Pacientes
  {
    path: 'pacientes/censo',
    component: ReporteCenso,
    data: { submodulo: 'REPORTES-PACIENTES' },
  },
  {
    path: 'pacientes/ingresos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'ingresos',
        titulo: 'Ingresos por área',
        etiquetaColumna: 'Área',
        etiquetaValor: 'Ingresos',
        conGrafica: true,
        graficaTitulo: 'Ingresos por área',
      },
    },
  },
  {
    path: 'pacientes/demografia',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'demografia',
        titulo: 'Demografía por sexo',
        etiquetaColumna: 'Sexo',
        etiquetaValor: 'Pacientes',
        conGrafica: false,
      },
    },
  },

  // Médica
  {
    path: 'medica/diagnosticos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'diagnosticos',
        titulo: 'Diagnósticos frecuentes',
        etiquetaColumna: 'Diagnóstico',
        etiquetaValor: 'Cantidad',
        conGrafica: true,
        graficaTitulo: 'Diagnósticos frecuentes',
      },
    },
  },
  {
    path: 'medica/altas',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'altas',
        titulo: 'Altas por tipo',
        etiquetaColumna: 'Tipo de alta',
        etiquetaValor: 'Cantidad',
        conGrafica: false,
      },
    },
  },
  {
    path: 'medica/atenciones',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'atenciones',
        titulo: 'Atenciones por médico',
        etiquetaColumna: 'Médico',
        etiquetaValor: 'Atenciones',
        conGrafica: false,
      },
    },
  },

  // Enfermería
  {
    path: 'enfermeria/monitoreo',
    component: ReporteMonitoreo,
    data: { submodulo: 'REPORTES-ENFERMERIA' },
  },
  {
    path: 'enfermeria/medicamentos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-ENFERMERIA',
      reporte: {
        clave: 'medicamentos',
        titulo: 'Medicamentos administrados',
        etiquetaColumna: 'Medicamento',
        etiquetaValor: 'Aplicaciones',
        conGrafica: true,
        graficaTitulo: 'Medicamentos administrados',
      },
    },
  },
  {
    path: 'enfermeria/cuidados',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-ENFERMERIA',
      reporte: {
        clave: 'cuidados',
        titulo: 'Cuidados realizados',
        etiquetaColumna: 'Cuidado',
        etiquetaValor: 'Ejecuciones',
        conGrafica: false,
      },
    },
  },
  {
    path: 'enfermeria/glucosa',
    component: ReporteGlucosa,
    data: { submodulo: 'REPORTES-ENFERMERIA' },
  },

  // Usuarios
  {
    path: 'usuarios/por-rol',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-USUARIOS',
      reporte: {
        clave: 'porRol',
        titulo: 'Usuarios por rol',
        etiquetaColumna: 'Rol',
        etiquetaValor: 'Usuarios',
        conGrafica: false,
      },
    },
  },
  {
    path: 'usuarios/accesos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-USUARIOS',
      reporte: {
        clave: 'accesos',
        titulo: 'Accesos por usuario',
        etiquetaColumna: 'Usuario',
        etiquetaValor: 'Accesos',
        conGrafica: true,
        graficaTitulo: 'Inicios de sesión',
      },
    },
  },

  // Bitácora
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
