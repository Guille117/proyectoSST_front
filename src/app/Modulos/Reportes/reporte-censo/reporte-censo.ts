import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportesService } from '../data/reportes-service';
import { Censo } from '../data/reportes-interfaz';
import { Celda, exportarExcel, exportarPdf } from '../data/reportes-export';
import { PopUps } from '../../../shared/popUps/popUpsService';

@Component({
  selector: 'app-reporte-censo',
  imports: [],
  templateUrl: './reporte-censo.html',
  styleUrl: '../reporte-comun.scss',
})
export class ReporteCenso implements OnInit, OnDestroy {
  private readonly service = inject(ReportesService);
  private readonly popUps = inject(PopUps);
  private sub?: Subscription;

  cargando = false;
  datos: Censo[] = [];

  ngOnInit(): void {
    this.generar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  generar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.sub = this.service.censo().subscribe({
      next: (d) => {
        this.datos = d;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.popUps.errorDesdeBackend(e, 'No se pudo cargar el censo.');
      },
    });
  }

  exportarPdf(): void {
    exportarPdf(
      'Censo de camas por área',
      ['Área', 'Estado', 'Cantidad'],
      this.datos.map((d) => [d.area, d.estado, d.cantidad] as Celda[]),
    );
  }

  exportarExcel(): void {
    exportarExcel(
      'Censo de camas por área',
      ['Área', 'Estado', 'Cantidad'],
      this.datos.map((d) => [d.area, d.estado, d.cantidad] as Celda[]),
    );
  }
}
