import { Routes } from "@angular/router"
import { Inventario } from "./inventario/inventario"
import { Ingresos } from "./ingresos/ingresos"
import { Proveedores } from "./proveedores/proveedores"
import { Salidas } from "./salidas/salidas"
import { Medicamentos } from "./medicamentos/medicamentos"
import { Insumos } from "./insumos/insumos"

export const rutasFarmacia: Routes=[
    { path: '', redirectTo: 'inventario', pathMatch: 'full' },
    {path:"inventario", component: Inventario},
    {path:"proveedores", component: Proveedores},
    {path:"ingresos", component: Ingresos},
    {path:"salidas", component: Salidas},
    {path:"medicamentos", component: Medicamentos},
    {path:"insumos", component: Insumos},
    {path:"productos", redirectTo: "medicamentos", pathMatch: "full"}

]