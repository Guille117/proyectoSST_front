import { Routes } from "@angular/router";
import { Roles } from "./roles/roles";
import { Horarios } from "./horarios/horarios";
import { Usu } from "./usu/usu";

export const rutasUsuarios: Routes=[
    {path: '', redirectTo: 'usu', pathMatch: 'full' },
    { path: 'usu', component: Usu, data: { submodulo: 'USUARIOS' } },
    { path: 'roles', component: Roles, data: { submodulo: 'ROLES' } },
    {path: 'horarios', component: Horarios, data: { submodulo: 'HORARIOS' } }
]
