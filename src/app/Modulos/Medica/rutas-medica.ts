import { Routes } from '@angular/router';
import { Alta } from './alta/alta';
import { Atencion } from './atencion/atencion';
import { Evaluacion } from './evaluacion/evaluacion';
import { Evolucion } from './evolucion/evolucion';
import { Indicaciones } from './indicaciones/indicaciones';
import { ProcedimientoMedico } from './procedimiento-medico/procedimiento-medico';

export const rutasMedica: Routes = [
  { path: '', redirectTo: 'atencion', pathMatch: 'full' },
  { path: 'atencion', component: Atencion },
  { path: 'evaluacion', component: Evaluacion },
  { path: 'procedimiento-medico', component: ProcedimientoMedico },
  { path: 'evolucion', component: Evolucion },
  { path: 'indicaciones', component: Indicaciones },
  { path: 'alta', component: Alta },
];
