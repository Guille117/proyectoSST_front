import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { PermisosService } from '../../Auth/data/permisos-service';

interface OpcionReporte {
  ruta?: string;
  titulo: string;
  submodulo: string;
}

interface GrupoReporte {
  titulo: string;
  prefijo: string;
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
  private readonly router = inject(Router);

  readonly grupos: GrupoReporte[] = [
    {
      titulo: 'Farmacia',
      prefijo: 'farmacia',
      opciones: [
        { ruta: 'farmacia/mas-vendidos', titulo: 'Medicamentos más vendidos', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/menos-vendidos', titulo: 'Medicamentos menos vendidos', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/vencimientos', titulo: 'Vencimientos por mes/año', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/proveedores', titulo: 'Proveedor con más entregas', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/stock', titulo: 'Stock bajo', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/rotacion', titulo: 'Rotación de inventario', submodulo: 'REPORTES-FARMACIA' },
        { ruta: 'farmacia/consumo-area', titulo: 'Consumo por área', submodulo: 'REPORTES-FARMACIA' },
      ],
    },
    {
      titulo: 'Pacientes',
      prefijo: 'pacientes',
      opciones: [
        { ruta: 'pacientes/censo', titulo: 'Censo de camas por área', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/ingresos', titulo: 'Ingresos por área', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/demografia', titulo: 'Demografía por sexo', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/egresos', titulo: 'Egresos por área', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/grupos-edad', titulo: 'Pacientes por grupo de edad', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/estancia', titulo: 'Tiempo de estancia promedio', submodulo: 'REPORTES-PACIENTES' },
        { ruta: 'pacientes/ocupacion', titulo: 'Ocupación de camas', submodulo: 'REPORTES-PACIENTES' },
      ],
    },
    {
      titulo: 'Médico',
      prefijo: 'medica',
      opciones: [
        { ruta: 'medica/diagnosticos', titulo: 'Diagnósticos frecuentes', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/altas', titulo: 'Altas por tipo', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/atenciones', titulo: 'Atenciones por médico', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/procedimientos', titulo: 'Procedimientos realizados', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/indicaciones', titulo: 'Indicaciones médicas por tipo', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/reingresos', titulo: 'Reingresos hospitalarios', submodulo: 'REPORTES-MEDICA' },
        { ruta: 'medica/tiempo-atencion', titulo: 'Tiempo de atención médica', submodulo: 'REPORTES-MEDICA' },
      ],
    },
    {
      titulo: 'Enfermería',
      prefijo: 'enfermeria',
      opciones: [
        { ruta: 'enfermeria/monitoreo', titulo: 'Monitoreo', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/medicamentos', titulo: 'Medicamentos administrados', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/cuidados', titulo: 'Cuidados realizados', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/glucosa', titulo: 'Glucosa promedio', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/signos-fuera-rango', titulo: 'Signos vitales fuera de rango', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/eventos-adversos', titulo: 'Eventos adversos', submodulo: 'REPORTES-ENFERMERIA' },
        { ruta: 'enfermeria/carga-enfermero', titulo: 'Carga de trabajo por enfermero', submodulo: 'REPORTES-ENFERMERIA' },
      ],
    },
    {
      titulo: 'Administración',
      prefijo: 'usuarios',
      opciones: [
        { ruta: 'usuarios/por-rol', titulo: 'Usuarios por rol', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/accesos', titulo: 'Accesos por usuario', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/sesiones', titulo: 'Sesiones activas', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/permisos', titulo: 'Permisos por módulo', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/intentos-fallidos', titulo: 'Intentos fallidos de acceso', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/actividad', titulo: 'Actividad por usuario', submodulo: 'REPORTES-USUARIOS' },
        { ruta: 'usuarios/creados', titulo: 'Usuarios creados por periodo', submodulo: 'REPORTES-USUARIOS' },
      ],
    },
    {
      titulo: 'Bitácora',
      prefijo: 'bitacora',
      opciones: [
        { ruta: 'bitacora/general', titulo: 'Bitácora general', submodulo: 'REPORTES-BITACORA-GENERAL' },
        { ruta: 'bitacora/pacientes', titulo: 'Bitácora de pacientes', submodulo: 'REPORTES-BITACORA-PACIENTES' },
      ],
    },
  ];

  readonly grupoActivo = signal(this.grupoDesdeUrl(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.grupoActivo.set(this.grupoDesdeUrl(this.router.url)));
  }

  grupoVisible(grupo: GrupoReporte): boolean {
    return grupo.opciones.some((opcion) => this.permisos.puedeLeerSubmodulo(opcion.submodulo));
  }

  grupoSeleccionado(): GrupoReporte | undefined {
    return (
      this.grupos.find(
        (grupo) => grupo.titulo === this.grupoActivo() && this.grupoVisible(grupo),
      ) ?? this.grupos.find((grupo) => this.grupoVisible(grupo))
    );
  }

  rutaInicial(grupo: GrupoReporte): string | null {
    return (
      grupo.opciones.find(
        (opcion) => opcion.ruta && this.permisos.puedeLeerSubmodulo(opcion.submodulo),
      )?.ruta ?? null
    );
  }

  grupoConectado(): boolean {
    const grupo = this.grupoSeleccionado();
    return !!grupo && this.rutaInicial(grupo) !== null;
  }

  seleccionarGrupo(grupo: GrupoReporte): void {
    this.grupoActivo.set(grupo.titulo);
    const ruta = this.rutaInicial(grupo);
    if (ruta) {
      void this.router.navigate(['/reportes', ...ruta.split('/')]);
    }
  }

  private grupoDesdeUrl(url: string): string {
    const segmento = url.split('?')[0].split('/').filter(Boolean)[1] ?? '';
    return (
      this.grupos.find((grupo) => segmento.startsWith(grupo.prefijo))?.titulo ??
      this.grupos.find((grupo) => this.grupoVisible(grupo))?.titulo ??
      'Farmacia'
    );
  }
}
