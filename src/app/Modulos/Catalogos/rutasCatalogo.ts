import { Routes } from "@angular/router";
import { CatalogoFarmacia } from "./catalogo-farmacia/catalogo-farmacia";
import { CatalogoUsuarios } from "./catalogo-usuarios/catalogo-usuarios";

export const rutasCatalogo: Routes=[
    {path: '', redirectTo: 'farmaciaCatalogo', pathMatch: 'full' },
    { path: 'farmaciaCatalogo', component: CatalogoFarmacia },
    { path: 'usuariosCatalogo', component: CatalogoUsuarios },
//     {path: 'horarios', component: Horarios}
];

