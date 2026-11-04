import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-grafica-barras',
  standalone: true,
  template: '<canvas #canvas></canvas>',
})
export class GraficaBarras implements AfterViewInit, OnChanges, OnDestroy {
  @Input() etiquetas: string[] = [];
  @Input() valores: number[] = [];
  @Input() titulo = '';

  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  ngAfterViewInit(): void {
    this.renderizar();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.renderizar();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderizar(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.etiquetas,
        datasets: [{ label: this.titulo, data: this.valores }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
      },
    };
    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
