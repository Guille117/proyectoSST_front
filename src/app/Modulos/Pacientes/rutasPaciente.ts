import { Routes } from "@angular/router";
import { Paciente } from "./paciente/paciente";
import { Camas } from "./camas/camas";


export const rutasPaciente: Routes=[
    {path: '', redirectTo: 'pacient', pathMatch: 'full' },
    { path: 'pacient', component: Paciente },
    { path: 'gCamas', component: Camas },

] 