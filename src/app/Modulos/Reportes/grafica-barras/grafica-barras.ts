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

const PALETA = [
  '#2563eb',
  '#3b82f6',
  '#0ea5e9',
  '#06b6d4',
  '#14b8a6',
  '#10b981',
  '#22c55e',
  '#84cc16',
  '#f59e0b',
  '#f97316',
];

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

    const colores = this.etiquetas.map((_, indice) => PALETA[indice % PALETA.length]);
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.etiquetas,
        datasets: [
          {
            label: this.titulo,
            data: this.valores,
            backgroundColor: colores,
            borderColor: colores,
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.72,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16, left: 4 } },
        animation: { duration: 650, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0b1739',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            padding: 12,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { size: 13, weight: 600 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (contexto) => ` ${contexto.parsed.x}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#eef2f7' },
            border: { display: false },
            ticks: { color: '#64748b', font: { size: 12 }, precision: 0 },
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#1e293b', font: { size: 12.5, weight: 600 }, autoSkip: false },
          },
        },
      },
    };

    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
