import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PermisosService } from '../../Auth/data/permisos-service';
import { PrincipalCatalogo } from './principal-catalogo';

describe('PrincipalCatalogo', () => {
  let component: PrincipalCatalogo;
  let fixture: ComponentFixture<PrincipalCatalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalCatalogo],
      providers: [
        provideRouter([]),
        { provide: PermisosService, useValue: { puedeLeerSubmodulo: () => true, puedeLeerModulo: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalCatalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
