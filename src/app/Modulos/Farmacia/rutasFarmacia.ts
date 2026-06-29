import { Routes } from "@angular/router"
import { Inventario } from "./inventario/inventario"
import { Ingresos } from "./ingresos/ingresos"
import { Proveedores } from "./proveedores/proveedores"
import { Salidas } from "./salidas/salidas"

export const rutasFarmacia: Routes=[
    {path:"inventario", component: Inventario},
    {path:"proveedores", component: Proveedores},
    {path:"ingresos", component: Ingresos},
    {path:"salidas", component: Salidas}

]