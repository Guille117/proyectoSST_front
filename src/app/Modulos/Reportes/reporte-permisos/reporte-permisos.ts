import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { PermisoModulo } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-permisos',
  imports: [],
  templateUrl: './reporte-permisos.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReportePermisos implements OnInit {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  cargando = false;
  datos: PermisoModulo[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.permisosPorModulo().subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudieron cargar los permisos.');
        this.cdr.detectChanges();
      },
    });
  }

  modulos(): number {
    return new Set(this.datos.map((d) => d.modulo)).size;
  }

  submodulos(): number {
    return new Set(this.datos.map((d) => d.submodulo)).size;
  }

  roles(): number {
    return new Set(this.datos.map((d) => d.rol)).size;
  }

  exportarPdf(): void {
    exportarPdf(
      'Permisos por módulo',
      ['Módulo', 'Submódulo', 'Rol', 'Leer', 'Crear', 'Editar', 'Eliminar'],
      this.filasExportacion(),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Permisos por módulo',
      ['Módulo', 'Submódulo', 'Rol', 'Leer', 'Crear', 'Editar', 'Eliminar'],
      this.filasExportacion(),
    );
  }

  private filasExportacion(): Celda[][] {
    const siNo = (valor: boolean) => (valor ? 'Sí' : 'No');
    return this.datos.map(
      (d) =>
        [
          d.modulo,
          d.submodulo,
          d.rol,
          siNo(d.leer),
          siNo(d.crear),
          siNo(d.editar),
          siNo(d.eliminar),
        ] as Celda[],
    );
  }
}
