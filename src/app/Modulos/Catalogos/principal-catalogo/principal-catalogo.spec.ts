import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrincipalCatalogo } from './principal-catalogo';

describe('PrincipalCatalogo', () => {
  let component: PrincipalCatalogo;
  let fixture: ComponentFixture<PrincipalCatalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalCatalogo],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalCatalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
