import { TestBed } from '@angular/core/testing';

import { ServicioInsumos } from './servicio-insumos';

describe('ServicioInsumos', () => {
  let service: ServicioInsumos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioInsumos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
