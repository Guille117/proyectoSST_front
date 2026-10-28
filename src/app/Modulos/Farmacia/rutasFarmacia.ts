import { Routes } from "@angular/router"
import { Inventario } from "./inventario/inventario"
import { Ingresos } from "./ingresos/ingresos"
import { Proveedores } from "./proveedores/proveedores"
import { Salidas } from "./salidas/salidas"
import { Medicamentos } from "./medicamentos/medicamentos"
import { Insumos } from "./insumos/insumos"

export const rutasFarmacia: Routes=[
    { path: '', redirectTo: 'inventario', pathMatch: 'full' },
    { path: "inventario", component: Inventario, data: { submodulo: 'INVENTARIO' } },
    { path: "proveedores", component: Proveedores, data: { submodulo: 'PROVEEDORES' } },
    { path: "ingresos", component: Ingresos, data: { submodulo: 'COMPRAS' } },
    { path: "salidas", component: Salidas, data: { submodulo: 'SALIDAS' } },
    { path: "medicamentos", component: Medicamentos, data: { submodulo: 'MEDICAMENTOS' } },
    { path: "insumos", component: Insumos, data: { submodulo: 'INSUMOS' } },
    { path: "productos", redirectTo: "medicamentos", pathMatch: "full" }
]
