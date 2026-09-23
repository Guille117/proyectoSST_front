import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrincipalPacientes } from './principal-pacientes';

describe('PrincipalPacientes', () => {
  let component: PrincipalPacientes;
  let fixture: ComponentFixture<PrincipalPacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalPacientes],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalPacientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
