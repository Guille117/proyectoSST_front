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
        { titulo: 'Medicamentos menos vendidos', submodulo: 'REPORTES-FARMACIA' },
        { titulo: 'Vencimientos por mes/año', submodulo: 'REPORTES-FARMACIA' },
        { titulo: 'Proveedor con más entregas', submodulo: 'REPORTES-FARMACIA' },
        { titulo: 'Stock bajo', submodulo: 'REPORTES-FARMACIA' },
        { titulo: 'Rotación de inventario', submodulo: 'REPORTES-FARMACIA' },
        { titulo: 'Consumo por área', submodulo: 'REPORTES-FARMACIA' },
      ],
    },
    {
      titulo: 'Pacientes',
      prefijo: 'pacientes',
      opciones: [
        { titulo: 'Censo de camas por área', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Ingresos por área', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Demografía por sexo', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Egresos por área', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Pacientes por grupo de edad', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Tiempo de estancia promedio', submodulo: 'REPORTES-PACIENTES' },
        { titulo: 'Ocupación de camas', submodulo: 'REPORTES-PACIENTES' },
      ],
    },
    {
      titulo: 'Médico',
      prefijo: 'medica',
      opciones: [
        { titulo: 'Diagnósticos frecuentes', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Altas por tipo', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Atenciones por médico', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Procedimientos realizados', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Indicaciones médicas por tipo', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Reingresos hospitalarios', submodulo: 'REPORTES-MEDICA' },
        { titulo: 'Tiempo de atención médica', submodulo: 'REPORTES-MEDICA' },
      ],
    },
    {
      titulo: 'Enfermería',
      prefijo: 'enfermeria',
      opciones: [
        { titulo: 'Monitoreo', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Medicamentos administrados', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Cuidados realizados', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Glucosa promedio', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Signos vitales fuera de rango', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Eventos adversos', submodulo: 'REPORTES-ENFERMERIA' },
        { titulo: 'Carga de trabajo por enfermero', submodulo: 'REPORTES-ENFERMERIA' },
      ],
    },
    {
      titulo: 'Administración',
      prefijo: 'usuarios',
      opciones: [
        { titulo: 'Usuarios por rol', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Accesos por usuario', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Sesiones activas', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Permisos por módulo', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Intentos fallidos de acceso', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Actividad por usuario', submodulo: 'REPORTES-USUARIOS' },
        { titulo: 'Usuarios creados por periodo', submodulo: 'REPORTES-USUARIOS' },
      ],
    },
    {
      titulo: 'Bitácora',
      prefijo: 'bitacora',
      opciones: [
        { titulo: 'Bitácora general', submodulo: 'REPORTES-BITACORA-GENERAL' },
        { titulo: 'Bitácora de pacientes', submodulo: 'REPORTES-BITACORA-PACIENTES' },
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
