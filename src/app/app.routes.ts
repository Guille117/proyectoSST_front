import { Routes } from '@angular/router';
import { Login } from './Modulos/Auth/login/login';
import { MainLayout } from './layout/main-layout/main-layout';
import { PrincipalFarmacia } from './Modulos/Farmacia/principal-farmacia/principal-farmacia';
import { rutasFarmacia } from './Modulos/Farmacia/rutasFarmacia';
import { PrincipalUsuarios } from './Modulos/Usuarios/principal-usuarios/principal-usuarios';
import { rutasUsuarios } from './Modulos/Usuarios/rutasUsuarios';
import { authGuard, loginGuard } from './Modulos/Auth/data/auth.guard';
import { catalogoModuloGuard, moduloGuard, submoduloGuard } from './Modulos/Auth/data/permiso.guard';
import { PrincipalCatalogo } from './Modulos/Catalogos/principal-catalogo/principal-catalogo';
import { rutasCatalogo } from './Modulos/Catalogos/rutasCatalogo';
import { PrincipalPacientes } from './Modulos/Pacientes/principal-pacientes/principal-pacientes';
import { rutasPaciente } from './Modulos/Pacientes/rutasPaciente';
import { Expediente } from './Modulos/Pacientes/expediente/expediente';
import { PrincipalMedica } from './Modulos/Medica/principal-medica/principal-medica';
import { rutasMedica } from './Modulos/Medica/rutas-medica';
import { PrincipalEnfermeria } from './Modulos/Enfermeria/principal-enfermeria/principal-enfermeria';
import { rutasEnfermeria } from './Modulos/Enfermeria/rutasEnfermeria';

export const routes: Routes = [
  {
    path: 'login', component: Login, canActivate: [loginGuard],
  },
  {
    path: '', component: MainLayout, canActivate: [authGuard], canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'farmacia',
        component: PrincipalFarmacia,
        canActivate: [moduloGuard],
        canActivateChild: [submoduloGuard],
        data: { modulo: 'FARMACIA' },
        children: rutasFarmacia,
      },
      {
        path: 'usuarios',
        component: PrincipalUsuarios,
        canActivate: [moduloGuard],
        canActivateChild: [submoduloGuard],
        data: { modulo: 'USUARIOS' },
        children: rutasUsuarios,
      },
      {
        path: 'catalogos',
        component: PrincipalCatalogo,
        canActivate: [catalogoModuloGuard],
        canActivateChild: [submoduloGuard],
        children: rutasCatalogo,
      },
      {
        path: 'pacientes',
        component: PrincipalPacientes,
        canActivate: [moduloGuard],
        canActivateChild: [submoduloGuard],
        data: { modulo: 'PACIENTES' },
        children: rutasPaciente,
      },
      {
        path: 'expediente/:pacienteId',
        component: Expediente,
        canActivate: [moduloGuard],
        data: { modulos: ['PACIENTES', 'MEDICA', 'ENFERMERIA'] },
      },
      {
        path: 'medica',
        component: PrincipalMedica,
        canActivate: [moduloGuard],
        canActivateChild: [submoduloGuard],
        data: { modulo: 'MEDICA' },
        children: rutasMedica,
      },
      {
        path: 'enfermeria',
        component: PrincipalEnfermeria,
        canActivate: [moduloGuard],
        canActivateChild: [submoduloGuard],
        data: { modulo: 'ENFERMERIA' },
        children: rutasEnfermeria,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
