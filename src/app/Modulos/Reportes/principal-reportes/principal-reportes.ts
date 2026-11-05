import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PermisosService } from '../../Auth/data/permisos-service';

interface OpcionReporte {
  ruta: string;
  titulo: string;
  submodulo: string;
}

interface GrupoReporte {
  titulo: string;
  opciones: OpcionReporte[];
}

@Component({
  selector: 'app-principal-reportes',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-reportes.html',
  styleUrl: './principal-reportes.scss',
})
export class PrincipalReportes {
  readonly permisos = inject(PermisosService);

  readonly grupos: GrupoReporte[] = [
    {
      titulo: 'Farmacia',
      opciones: [
        { ruta: 'farmacia/mas-vendidos', titulo: 'Medicamentos más vendidos', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/menos-vendidos', titulo: 'Medicamentos menos vendidos', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/vencimientos', titulo: 'Vencimientos por mes/año', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/proveedores', titulo: 'Proveedor con más entregas', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/stock', titulo: 'Stock bajo', submodulo: 'REPORTES-FARMACIA' },
      ],
    },
    {
      titulo: 'Pacientes',
      opciones: [
        { ruta: 'pacientes/censo', titulo: 'Censo de camas por área', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/ingresos', titulo: 'Ingresos por área', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/demografia', titulo: 'Demografía por sexo', submodulo: 'REPORTES-PACIENTES' },
      ],
    },
    {
      titulo: 'Médica',
      opciones: [
        { ruta: 'medica/diagnosticos', titulo: 'Diagnósticos frecuentes', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/altas', titulo: 'Altas por tipo', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/atenciones', titulo: 'Atenciones por médico', submodulo: 'REPORTES-MEDICA' },
      ],
    },
    {
      titulo: 'Enfermería',
      opciones: [
        { ruta: 'enfermeria/monitoreo', titulo: 'Monitoreo', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/medicamentos', titulo: 'Medicamentos administrados', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/cuidados', titulo: 'Cuidados realizados', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/glucosa', titulo: 'Glucosa promedio', submodulo: 'REPORTES-ENFERMERIA' },
      ],
    },
    {
      titulo: 'Usuarios',
      opciones: [
        { ruta: 'usuarios/por-rol', titulo: 'Usuarios por rol', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/accesos', titulo: 'Accesos por usuario', submodulo: 'REPORTES-USUARIOS' },
      ],
    },
    {
      titulo: 'Bitácora',
      opciones: [
        { ruta: 'bitacora-general', titulo: 'Bitácora general', submodulo: 'REPORTES-BITACORA-GENERAL' },
        { ruta: 'bitacora-pacientes', titulo: 'Bitácora de pacientes', submodulo: 'REPORTES-BITACORA-PACIENTES' },
      ],
    },
  ];

  grupoVisible(grupo: GrupoReporte): boolean {
    return grupo.opciones.some((opcion) => this.permisos.puedeLeerSubmodulo(opcion.submodulo));
  }
}
