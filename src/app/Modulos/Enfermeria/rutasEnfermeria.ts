import { Routes } from '@angular/router';
import { Atencion } from '../Medica/atencion/atencion';
import { Monitoreo } from './monitoreo/monitoreo';
import { Notas } from './notas/notas';
import { Tratamientos } from './tratamientos/tratamientos';

export const rutasEnfermeria: Routes = [
  { path: '', redirectTo: 'atencion', pathMatch: 'full' },
  {
    path: 'atencion',
    component: Atencion,
    data: {
      submodulo: 'ENF-ATENCION',
      rutaEpisodio: ['/enfermeria', 'monitoreo'],
      rutaUltimoEpisodio: ['/enfermeria', 'monitoreo'],
      mostrarAltas: true,
      mostrarExpediente: true,
      mostrarUltimoEpisodio: true,
    },
  },
  { path: 'monitoreo', component: Monitoreo, data: { submodulo: 'ENF-MONITOREO' } },
  { path: 'tratamientos', component: Tratamientos, data: { submodulo: 'ENF-TRATAMIENTOS' } },
  { path: 'notas', component: Notas, data: { submodulo: 'ENF-NOTAS' } },
];
