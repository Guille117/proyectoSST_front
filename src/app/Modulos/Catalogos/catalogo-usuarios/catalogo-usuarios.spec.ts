import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoUsuarios } from './catalogo-usuarios';

describe('CatalogoUsuarios', () => {
  let component: CatalogoUsuarios;
  let fixture: ComponentFixture<CatalogoUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoUsuarios],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoUsuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
