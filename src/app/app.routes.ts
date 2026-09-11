import { Routes } from '@angular/router';
import { Login } from './Modulos/Auth/login/login';
import { MainLayout } from './layout/main-layout/main-layout';
import { PrincipalFarmacia } from './Modulos/Farmacia/principal-farmacia/principal-farmacia';
import { rutasFarmacia } from './Modulos/Farmacia/rutasFarmacia';
import { PrincipalUsuarios } from './Modulos/Usuarios/principal-usuarios/principal-usuarios';
import { rutasUsuarios } from './Modulos/Usuarios/rutasUsuarios';
import { authGuard, loginGuard } from './Modulos/Auth/data/auth.guard';

export const routes: Routes = [
  {
    path: 'login', component: Login,canActivate: [loginGuard],
  },
  {
    path: '', component: MainLayout, canActivate: [authGuard],canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'farmacia', component: PrincipalFarmacia, children: rutasFarmacia },
      { path: 'usuarios', component: PrincipalUsuarios, children: rutasUsuarios },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
