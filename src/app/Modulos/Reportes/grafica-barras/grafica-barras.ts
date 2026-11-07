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
  Plugin,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const MAX_ETIQUETA = 20;

/** Recorta las etiquetas del eje para que los nombres largos no reduzcan el área de barras. */
function recortarEtiqueta(texto: string): string {
  return texto.length > MAX_ETIQUETA ? `${texto.slice(0, MAX_ETIQUETA - 1)}…` : texto;
}

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

/** Pinta la cantidad al final de cada barra cuando el consumidor lo solicita. */
const pluginValores: Plugin<'bar'> = {
  id: 'valoresFinales',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const datos = chart.data.datasets[0]?.data ?? [];

    ctx.save();
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    chart.getDatasetMeta(0).data.forEach((elemento, indice) => {
      const valor = datos[indice];
      if (typeof valor !== 'number') return;
      const barra = elemento as BarElement;
      ctx.fillText(String(valor), barra.x + 8, barra.y);
    });

    ctx.restore();
  },
};

@Component({
  selector: 'app-grafica-barras',
  standalone: true,
  template: '<canvas #canvas></canvas>',
  styles: [':host { display: block; width: 100%; height: 100%; }'],
})
export class GraficaBarras implements AfterViewInit, OnChanges, OnDestroy {
  @Input() etiquetas: string[] = [];
  @Input() valores: number[] = [];
  @Input() titulo = '';
  @Input() mostrarValores = false;

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
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      plugins: this.mostrarValores ? [pluginValores] : [],
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
            maxBarThickness: 26,
            barPercentage: 0.72,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: this.mostrarValores ? 44 : 16, left: 4 } },
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
              title: (items) => {
                const indice = items[0]?.dataIndex;
                return indice === undefined ? '' : (this.etiquetas[indice] ?? '');
              },
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
            ticks: {
              color: '#1e293b',
              font: { size: 12.5, weight: 600 },
              autoSkip: false,
              callback: (valor) => recortarEtiqueta(this.etiquetas[Number(valor)] ?? String(valor)),
            },
          },
        },
      },
    };

    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
