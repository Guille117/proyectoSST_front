import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PermisosService } from '../../Auth/data/permisos-service';
import { PrincipalUsuarios } from './principal-usuarios';

describe('PrincipalUsuarios', () => {
  let component: PrincipalUsuarios;
  let fixture: ComponentFixture<PrincipalUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalUsuarios],
      providers: [
        provideRouter([]),
        { provide: PermisosService, useValue: { puedeLeerSubmodulo: () => true, puedeLeerModulo: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalUsuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
