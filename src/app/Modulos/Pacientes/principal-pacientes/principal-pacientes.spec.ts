import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PermisosService } from '../../Auth/data/permisos-service';
import { PrincipalPacientes } from './principal-pacientes';

describe('PrincipalPacientes', () => {
  let component: PrincipalPacientes;
  let fixture: ComponentFixture<PrincipalPacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalPacientes],
      providers: [
        provideRouter([]),
        { provide: PermisosService, useValue: { puedeLeerSubmodulo: () => true, puedeLeerModulo: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalPacientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
