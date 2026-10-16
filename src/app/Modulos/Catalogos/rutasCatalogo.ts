import { Routes } from "@angular/router";
import { CatalogoFarmacia } from "./catalogo-farmacia/catalogo-farmacia";
import { CatalogoUsuarios } from "./catalogo-usuarios/catalogo-usuarios";
import { CatalogoPaciente } from "./catalogo-paciente/catalogo-paciente";
import { CatalogoGestionClinica } from "./catalogo-gestion-clinica/catalogo-gestion-clinica";

export const rutasCatalogo: Routes=[
    {path: '', redirectTo: 'farmaciaCatalogo', pathMatch: 'full' },
    { path: 'farmaciaCatalogo', component: CatalogoFarmacia },
    { path: 'usuariosCatalogo', component: CatalogoUsuarios },
    {path: 'pacienteCatalogo', component: CatalogoPaciente },
    {path: 'gestionClinicaCatalogo', component: CatalogoGestionClinica },
//     {path: 'horarios', component: Horarios}
];

