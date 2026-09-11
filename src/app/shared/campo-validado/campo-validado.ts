import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-campo-validado',
  standalone: true,
  imports: [],
  templateUrl: './campo-validado.html',
  styleUrl: './campo-validado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoValidado {
  label = input.required<string>();
  fieldId = input<string>('');
  showError = input<boolean>(false);
  errorMessage = input<string>('');
  iconText = input<string>('!');
}