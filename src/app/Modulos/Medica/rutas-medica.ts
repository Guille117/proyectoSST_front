import { Routes } from '@angular/router';
import { Evaluacion } from './evaluacion/evaluacion';
import { Indicaciones } from './indicaciones/indicaciones';

export const rutasMedica: Routes = [
  { path: '', redirectTo: 'evaluacion', pathMatch: 'full' },
  { path: 'evaluacion', component: Evaluacion },
  { path: 'indicaciones', component: Indicaciones },
];
