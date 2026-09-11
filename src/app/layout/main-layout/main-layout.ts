import { Component } from '@angular/core';
import { MenuLateral } from '../menu-lateral/menu-lateral';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-main-layout',
  imports: [MenuLateral, Topbar],
  template: `
    <app-topbar></app-topbar>
    <app-menu-lateral></app-menu-lateral>
  `,
})
export class MainLayout {}
