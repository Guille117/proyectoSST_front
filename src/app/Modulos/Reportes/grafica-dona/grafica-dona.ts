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
  ArcElement,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Plugin,
  Tooltip,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

const COLOR_TEXTO = '#0f172a';
const COLOR_SECUNDARIO = '#64748b';

/** Total y leyenda del centro de la dona. */
function pluginCentro(total: number, etiqueta: string): Plugin<'doughnut'> {
  return {
    id: 'textoCentro',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLOR_TEXTO;
      ctx.font = '700 24px Inter, sans-serif';
      ctx.fillText(String(total), x, y - 9);
      ctx.fillStyle = COLOR_SECUNDARIO;
      ctx.font = '500 11.5px Inter, sans-serif';
      ctx.fillText(etiqueta, x, y + 12);
      ctx.restore();
    },
  };
}

/** Muestra el porcentaje dentro de cada porción cuando hay espacio suficiente. */
const pluginPorcentajes: Plugin<'doughnut'> = {
  id: 'porcentajesDona',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const valores = (chart.data.datasets[0]?.data ?? []) as number[];
    const total = valores.reduce((suma, valor) => suma + valor, 0);
    if (!total) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 12px Inter, sans-serif';

    chart.getDatasetMeta(0).data.forEach((elemento, indice) => {
      const porcentaje = (valores[indice] / total) * 100;
      if (porcentaje < 12) return;
      const posicion = (elemento as ArcElement).tooltipPosition(true);
      ctx.fillText(`${porcentaje.toFixed(1)} %`, posicion.x, posicion.y);
    });

    ctx.restore();
  },
};

@Component({
  selector: 'app-grafica-dona',
  standalone: true,
  template: '<canvas #canvas></canvas>',
  styles: [':host { display: block; width: 100%; height: 100%; }'],
})
export class GraficaDona implements AfterViewInit, OnChanges, OnDestroy {
  @Input() etiquetas: string[] = [];
  @Input() valores: number[] = [];
  @Input() colores: string[] = ['#2563eb', '#14b8a6'];
  @Input() total = 0;
  @Input() etiquetaTotal = 'Unidades totales';

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

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      plugins: [pluginPorcentajes, pluginCentro(this.total, this.etiquetaTotal)],
      data: {
        labels: this.etiquetas,
        datasets: [
          {
            data: this.valores,
            backgroundColor: this.colores,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        layout: { padding: 4 },
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
            callbacks: {
              label: (contexto) => {
                const valor = Number(contexto.parsed);
                const total = this.valores.reduce((suma, item) => suma + item, 0);
                const porcentaje = total ? ((valor / total) * 100).toFixed(1) : '0.0';
                return ` ${valor} unidades (${porcentaje} %)`;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
