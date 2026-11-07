import { Component, input, output } from '@angular/core';

export type ReporteVista = 'grafica' | 'tabla';

@Component({
  selector: 'app-reporte-vista-toggle',
  standalone: true,
  template: `
    <div class="vista-toggle" role="group" [attr.aria-label]="etiqueta()">
      <button
        type="button"
        class="vista-btn"
        [class.vista-btn--activa]="vista() === 'grafica'"
        [attr.aria-pressed]="vista() === 'grafica'"
        (click)="cambiar.emit('grafica')"
        title="Ver gráfica"
        aria-label="Ver gráfica"
      >
        <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="vista-btn"
        [class.vista-btn--activa]="vista() === 'tabla'"
        [attr.aria-pressed]="vista() === 'tabla'"
        (click)="cambiar.emit('tabla')"
        title="Ver tabla"
        aria-label="Ver tabla"
      >
        <i class="bi bi-grid-3x3-gap" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .vista-toggle {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
      }

      .vista-btn {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        font-size: 1rem;
        cursor: pointer;
        transition:
          background-color 0.2s ease,
          color 0.2s ease;
      }

      .vista-btn:hover {
        background: #eef2f6;
        color: #334155;
      }

      .vista-btn:focus-visible {
        outline: 2px solid var(--azulSecundario);
        outline-offset: 1px;
      }

      .vista-btn--activa {
        background: #e9f1fe;
        color: #1d4ed8;
      }

      @media (hover: none) and (pointer: coarse) {
        .vista-btn {
          width: 44px;
          height: 44px;
        }
      }
    `,
  ],
})
export class ReporteVistaToggle {
  readonly vista = input.required<ReporteVista>();
  readonly etiqueta = input('Cambiar vista del reporte');
  readonly cambiar = output<ReporteVista>();
}
