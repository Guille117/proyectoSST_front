import { Routes } from '@angular/router';
import { PrincipalFarmacia } from './Modulos/Farmacia/principal-farmacia/principal-farmacia';
import { rutasFarmacia } from './Modulos/Farmacia/rutasFarmacia';


export const routes: Routes = [
    {path: 'farmacia', component: PrincipalFarmacia, children: rutasFarmacia}
];
