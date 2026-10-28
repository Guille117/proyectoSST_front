import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';

import { ModalAgregarUusuario } from './modal-agregar-uusuario';

describe('ModalAgregarUusuario', () => {
  let component: ModalAgregarUusuario;
  let fixture: ComponentFixture<ModalAgregarUusuario>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAgregarUusuario],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModalAgregarUusuario);
    component = fixture.componentInstance;
    fixture.detectChanges();

    for (const recurso of ['puestos', 'horarios', 'roles', 'especialidades']) {
      httpMock.expectOne(`${environment.apiUrl}/${recurso}?activos=true`).flush([]);
    }

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
