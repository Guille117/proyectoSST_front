import { Routes } from "@angular/router";
import { Roles } from "./roles/roles";
import { Horarios } from "./horarios/horarios";
import { Usu } from "./usu/usu";

export const rutasUsuarios: Routes=[
    {path: '', redirectTo: 'usu', pathMatch: 'full' },
    { path: 'usu', component: Usu },
    { path: 'roles', component: Roles },
    {path: 'horarios', component: Horarios}
] 