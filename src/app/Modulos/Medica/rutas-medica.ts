import { Routes } from '@angular/router';
import { Alta } from './alta/alta';
import { Evaluacion } from './evaluacion/evaluacion';
import { Evolucion } from './evolucion/evolucion';
import { Indicaciones } from './indicaciones/indicaciones';

export const rutasMedica: Routes = [
  { path: '', redirectTo: 'evaluacion', pathMatch: 'full' },
  { path: 'evaluacion', component: Evaluacion },
  { path: 'evolucion', component: Evolucion },
  { path: 'indicaciones', component: Indicaciones },
  { path: 'alta', component: Alta },
];
