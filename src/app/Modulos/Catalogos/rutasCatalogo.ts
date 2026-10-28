import { Routes } from "@angular/router";
import { catalogoInicioGuard } from "../Auth/data/permiso.guard";
import { CatalogoFarmacia } from "./catalogo-farmacia/catalogo-farmacia";
import { CatalogoUsuarios } from "./catalogo-usuarios/catalogo-usuarios";
import { CatalogoPaciente } from "./catalogo-paciente/catalogo-paciente";
import { CatalogoGestionClinica } from "./catalogo-gestion-clinica/catalogo-gestion-clinica";

export const rutasCatalogo: Routes=[
    { path: '', pathMatch: 'full', canActivate: [catalogoInicioGuard], children: [] },
    { path: 'farmaciaCatalogo', component: CatalogoFarmacia, data: { submodulo: 'CATALOGOS-FARMACIA', redireccion: '/catalogos' } },
    { path: 'usuariosCatalogo', component: CatalogoUsuarios, data: { submodulo: 'CATALOGOS-USUARIOS', redireccion: '/catalogos' } },
    { path: 'pacienteCatalogo', component: CatalogoPaciente, data: { submodulo: 'CATALOGOS-PACIENTES', redireccion: '/catalogos' } },
    { path: 'gestionClinicaCatalogo', component: CatalogoGestionClinica, data: { submodulo: 'CATALOGOS-CLINICA', redireccion: '/catalogos' } },
];
