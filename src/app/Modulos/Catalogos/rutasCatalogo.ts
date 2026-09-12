import { Routes } from "@angular/router";
import { CatalogoUsuarios } from "./catalogo-usuarios/catalogo-usuarios";
import { CatalogoFarmacia } from "./catalogo-farmacia/catalogo-farmacia";

export const rutasCatalogo: Routes=[
    {path: '', redirectTo: 'farmaciaCatalogo', pathMatch: 'full' },
    { path: 'farmaciaCatalogo', component: CatalogoFarmacia },
    { path: 'usuariosCatalogo', component: CatalogoUsuarios },
//     {path: 'horarios', component: Horarios}
];

