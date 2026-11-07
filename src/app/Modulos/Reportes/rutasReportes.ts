import { Routes } from '@angular/router';
import { ReporteMasVendidos } from './reporte-mas-vendidos/reporte-mas-vendidos';
import { ReporteConteo } from './reporte-conteo/reporte-conteo';
import { ReporteVencimientos } from './reporte-vencimientos/reporte-vencimientos';
import { ReporteProveedores } from './reporte-proveedores/reporte-proveedores';
import { ReporteStock } from './reporte-stock/reporte-stock';
import { ReporteCenso } from './reporte-censo/reporte-censo';
import { ReporteGlucosa } from './reporte-glucosa/reporte-glucosa';
import { ReporteMonitoreo } from './reporte-monitoreo/reporte-monitoreo';
import { BitacoraGeneral } from './bitacora-general/bitacora-general';
import { BitacoraPacientes } from './bitacora-pacientes/bitacora-pacientes';
import { ReporteSesiones } from './reporte-sesiones/reporte-sesiones';
import { ReportePermisos } from './reporte-permisos/reporte-permisos';

export const rutasReportes: Routes = [
  { path: '', redirectTo: 'farmacia/mas-vendidos', pathMatch: 'full' },

  // Farmacia
  {
    path: 'farmacia/mas-vendidos',
    component: ReporteMasVendidos,
    data: { submodulo: 'REPORTES-FARMACIA' },
  },
  {
    path: 'farmacia/menos-vendidos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-FARMACIA',
      reporte: {
        clave: 'menosVendidos',
        titulo: 'Medicamentos menos vendidos',
        etiquetaColumna: 'Producto',
        etiquetaValor: 'Cantidad',
        conGrafica: true,
        graficaTitulo: 'Productos con menos salidas',
        tipoGrafica: 'barras',
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
        tipoGrafica: 'barras',
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
        conGrafica: true,
        graficaTitulo: 'Distribución por sexo',
        tipoGrafica: 'dona',
        formatearEtiquetas: true,
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
        etiquetaValor: 'Atenciones',
        conGrafica: true,
        graficaTitulo: 'Diagnósticos más frecuentes',
        tipoGrafica: 'barras',
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
        etiquetaValor: 'Altas',
        conGrafica: true,
        graficaTitulo: 'Distribución por tipo de alta',
        tipoGrafica: 'dona',
        formatearEtiquetas: true,
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
        conGrafica: true,
        graficaTitulo: 'Atenciones por médico',
        tipoGrafica: 'barras',
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
        tipoGrafica: 'barras',
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
        conGrafica: true,
        graficaTitulo: 'Cuidados realizados',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'enfermeria/glucosa',
    component: ReporteGlucosa,
    data: { submodulo: 'REPORTES-ENFERMERIA' },
  },

  // Administración
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
        conGrafica: true,
        graficaTitulo: 'Distribución por rol',
        tipoGrafica: 'dona',
        formatearEtiquetas: true,
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
        graficaTitulo: 'Accesos por usuario',
        tipoGrafica: 'barras',
      },
    },
  },

  // Bitácora
  {
    path: 'bitacora/general',
    component: BitacoraGeneral,
    data: { submodulo: 'REPORTES-BITACORA-GENERAL' },
  },
  {
    path: 'bitacora/pacientes',
    component: BitacoraPacientes,
    data: { submodulo: 'REPORTES-BITACORA-PACIENTES' },
  },

  // Fase 2: reportes adicionales
  {
    path: 'farmacia/rotacion',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-FARMACIA',
      reporte: {
        clave: 'rotacion',
        titulo: 'Rotación de inventario',
        etiquetaColumna: 'Producto',
        etiquetaValor: 'Rotación (%)',
        conGrafica: true,
        graficaTitulo: 'Rotación por producto',
        tipoGrafica: 'barras',
        tipoValor: 'porcentaje',
      },
    },
  },
  {
    path: 'farmacia/consumo-area',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-FARMACIA',
      reporte: {
        clave: 'consumoArea',
        titulo: 'Consumo por área',
        etiquetaColumna: 'Área',
        etiquetaValor: 'Unidades',
        conGrafica: true,
        graficaTitulo: 'Consumo por área',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'pacientes/egresos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'egresos',
        titulo: 'Egresos por área',
        etiquetaColumna: 'Área',
        etiquetaValor: 'Egresos',
        conGrafica: true,
        graficaTitulo: 'Egresos por área',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'pacientes/grupos-edad',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'gruposEdad',
        titulo: 'Pacientes por grupo de edad',
        etiquetaColumna: 'Grupo de edad',
        etiquetaValor: 'Pacientes',
        conGrafica: true,
        graficaTitulo: 'Pacientes por grupo de edad',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'pacientes/estancia',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'estancia',
        titulo: 'Tiempo de estancia promedio',
        etiquetaColumna: 'Área',
        etiquetaValor: 'Días promedio',
        conGrafica: true,
        graficaTitulo: 'Estancia promedio por área',
        tipoGrafica: 'barras',
        tipoValor: 'promedio',
      },
    },
  },
  {
    path: 'pacientes/ocupacion',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-PACIENTES',
      reporte: {
        clave: 'ocupacion',
        titulo: 'Ocupación de camas',
        etiquetaColumna: 'Área',
        etiquetaValor: '% ocupación',
        conGrafica: true,
        graficaTitulo: 'Ocupación por área',
        tipoGrafica: 'barras',
        tipoValor: 'porcentaje',
      },
    },
  },
  {
    path: 'medica/procedimientos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'procedimientos',
        titulo: 'Procedimientos realizados',
        etiquetaColumna: 'Procedimiento',
        etiquetaValor: 'Realizados',
        conGrafica: true,
        graficaTitulo: 'Procedimientos realizados',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'medica/indicaciones',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'indicaciones',
        titulo: 'Indicaciones médicas por tipo',
        etiquetaColumna: 'Tipo',
        etiquetaValor: 'Indicaciones',
        conGrafica: true,
        graficaTitulo: 'Indicaciones por tipo',
        tipoGrafica: 'dona',
        formatearEtiquetas: true,
      },
    },
  },
  {
    path: 'medica/reingresos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'reingresos',
        titulo: 'Reingresos hospitalarios',
        etiquetaColumna: 'Paciente',
        etiquetaValor: 'Reingresos',
        conGrafica: true,
        graficaTitulo: 'Reingresos por paciente',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'medica/tiempo-atencion',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-MEDICA',
      reporte: {
        clave: 'tiempoAtencion',
        titulo: 'Tiempo de atención médica',
        etiquetaColumna: 'Médico',
        etiquetaValor: 'Minutos promedio',
        conGrafica: true,
        graficaTitulo: 'Tiempo promedio de atención',
        tipoGrafica: 'barras',
        tipoValor: 'promedio',
      },
    },
  },
  {
    path: 'enfermeria/signos-fuera-rango',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-ENFERMERIA',
      reporte: {
        clave: 'signosFueraRango',
        titulo: 'Signos vitales fuera de rango',
        etiquetaColumna: 'Signo',
        etiquetaValor: 'Registros',
        conGrafica: true,
        graficaTitulo: 'Registros fuera de rango por signo',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'enfermeria/eventos-adversos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-ENFERMERIA',
      reporte: {
        clave: 'eventos',
        titulo: 'Eventos y omisiones',
        etiquetaColumna: 'Evento',
        etiquetaValor: 'Casos',
        conGrafica: true,
        graficaTitulo: 'Eventos y omisiones registradas',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'enfermeria/carga-enfermero',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-ENFERMERIA',
      reporte: {
        clave: 'cargaEnfermero',
        titulo: 'Carga de trabajo por enfermero',
        etiquetaColumna: 'Enfermero',
        etiquetaValor: 'Actividades',
        conGrafica: true,
        graficaTitulo: 'Actividades por enfermero',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'usuarios/sesiones',
    component: ReporteSesiones,
    data: { submodulo: 'REPORTES-USUARIOS' },
  },
  {
    path: 'usuarios/permisos',
    component: ReportePermisos,
    data: { submodulo: 'REPORTES-USUARIOS' },
  },
  {
    path: 'usuarios/intentos-fallidos',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-USUARIOS',
      reporte: {
        clave: 'intentosFallidos',
        titulo: 'Intentos fallidos de acceso',
        etiquetaColumna: 'Usuario',
        etiquetaValor: 'Intentos',
        conGrafica: true,
        graficaTitulo: 'Intentos fallidos por usuario',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'usuarios/actividad',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-USUARIOS',
      reporte: {
        clave: 'actividad',
        titulo: 'Actividad por usuario',
        etiquetaColumna: 'Usuario',
        etiquetaValor: 'Acciones',
        conGrafica: true,
        graficaTitulo: 'Actividad por usuario',
        tipoGrafica: 'barras',
      },
    },
  },
  {
    path: 'usuarios/creados',
    component: ReporteConteo,
    data: {
      submodulo: 'REPORTES-USUARIOS',
      reporte: {
        clave: 'usuariosCreados',
        titulo: 'Usuarios creados por período',
        etiquetaColumna: 'Período',
        etiquetaValor: 'Usuarios',
        conGrafica: true,
        graficaTitulo: 'Usuarios creados por período',
        tipoGrafica: 'barras',
      },
    },
  },
];
