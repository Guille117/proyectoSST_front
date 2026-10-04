import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CampoValidado } from '../../../shared/campo-validado/campo-validado';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';

@Component({
  selector: 'app-insumos',
  imports: [CampoValidado, TabSwitch],
  templateUrl: './insumos.html',
  styleUrl: './insumos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Insumos {}