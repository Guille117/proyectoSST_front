import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PermisosService } from '../../Modulos/Auth/data/permisos-service';
import { MenuLateral } from './menu-lateral';

describe('MenuLateral', () => {
  let component: MenuLateral;
  let fixture: ComponentFixture<MenuLateral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuLateral],
      providers: [
        provideRouter([]),
        { provide: PermisosService, useValue: { puedeLeerModulo: () => true, tieneAlgunCatalogo: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuLateral);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
