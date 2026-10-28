import { Routes } from '@angular/router';
import { Alta } from './alta/alta';
import { Atencion } from './atencion/atencion';
import { Evaluacion } from './evaluacion/evaluacion';
import { Evolucion } from './evolucion/evolucion';
import { Indicaciones } from './indicaciones/indicaciones';
import { ProcedimientoMedico } from './procedimiento-medico/procedimiento-medico';

export const rutasMedica: Routes = [
  { path: '', redirectTo: 'atencion', pathMatch: 'full' },
  { path: 'atencion', component: Atencion, data: { submodulo: 'MED-ATENCION' } },
  { path: 'evaluacion', component: Evaluacion, data: { submodulo: 'MED-EVALUACION' } },
  { path: 'procedimiento-medico', component: ProcedimientoMedico, data: { submodulo: 'MED-PROCEDIMIENTO' } },
  { path: 'evolucion', component: Evolucion, data: { submodulo: 'MED-EVOLUCION' } },
  { path: 'indicaciones', component: Indicaciones, data: { submodulo: 'MED-INDICACIONES' } },
  { path: 'alta', component: Alta, data: { submodulo: 'MED-ALTA' } },
];
