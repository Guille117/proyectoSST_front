import { Routes } from '@angular/router';
import { ReporteConteo } from './reporte-conteo/reporte-conteo';

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
];
