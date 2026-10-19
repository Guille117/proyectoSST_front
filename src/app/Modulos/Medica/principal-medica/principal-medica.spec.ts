import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { PrincipalMedica } from './principal-medica';
import { EpisodioActivoService } from '../data/episodio-activo-service';

/** Pantalla de relleno: sustituye a los submódulos para probar la navegación del contenedor. */
@Component({ selector: 'app-pantalla-prueba', template: '' })
class PantallaPrueba {}

describe('PrincipalMedica', () => {
  let component: PrincipalMedica;
  let fixture: ComponentFixture<PrincipalMedica>;
  const episodioActivo = {
    limpiar: vi.fn(),
    guardar: vi.fn(),
    obtener: vi.fn(),
    esSoloLectura: () => false,
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    await TestBed.configureTestingModule({
      imports: [PrincipalMedica, PantallaPrueba],
      providers: [
        { provide: EpisodioActivoService, useValue: episodioActivo },
        provideRouter([
          { path: 'medica/atencion', component: PantallaPrueba },
          { path: 'medica/evaluacion', component: PantallaPrueba },
          { path: '**', component: PantallaPrueba },
        ]),
      ],
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
    const opciones = Array.from(menu.querySelectorAll('.subMenuNav .option'), (opcion: Element) =>
      opcion.textContent?.trim(),
    );

    expect(opciones).toEqual([
      'Evaluación clínica',
      'Procedimiento médico',
      'Indicaciones médicas',
      'Evolución médica',
      'Alta médica',
    ]);
  });

  it('oculta el submenú en la selección del paciente y lo muestra al abrir un episodio', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/medica/atencion');
    fixture.detectChanges();

    expect(component.submenuVisible()).toBe(false);
    expect(fixture.nativeElement.querySelector('.subMenuNav')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Módulo Médico');

    await router.navigateByUrl('/medica/evaluacion');
    fixture.detectChanges();

    expect(component.submenuVisible()).toBe(true);
    expect(fixture.nativeElement.querySelector('.subMenuNav')).not.toBeNull();
  });

  it('limpia el episodio activo al cerrarlo', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.cerrarEpisodio();

    expect(episodioActivo.limpiar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/medica', 'atencion']);
  });
});
