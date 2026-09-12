import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoFarmacia } from './catalogo-farmacia';

describe('CatalogoFarmacia', () => {
  let component: CatalogoFarmacia;
  let fixture: ComponentFixture<CatalogoFarmacia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoFarmacia],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoFarmacia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
