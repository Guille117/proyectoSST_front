import { Routes } from '@angular/router';
import { Evaluacion } from './evaluacion/evaluacion';

export const rutasMedica: Routes = [
  { path: '', redirectTo: 'evaluacion', pathMatch: 'full' },
  { path: 'evaluacion', component: Evaluacion },
];
