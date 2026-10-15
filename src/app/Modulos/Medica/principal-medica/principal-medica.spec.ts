import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PrincipalMedica } from './principal-medica';

describe('PrincipalMedica', () => {
  let component: PrincipalMedica;
  let fixture: ComponentFixture<PrincipalMedica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalMedica],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalMedica);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece el acceso a las pantallas del módulo en el submenú', () => {
    const menu: HTMLElement = fixture.nativeElement;
    const opciones = Array.from(
      menu.querySelectorAll('.subMenuNav .option'),
      (opcion: Element) => opcion.textContent?.trim(),
    );

    expect(opciones).toEqual([
      'Evaluación clínica',
      'Indicaciones médicas',
      'Evolución médica',
      'Alta médica',
    ]);
  });
});
