import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrincipalUsuarios } from './principal-usuarios';

describe('PrincipalUsuarios', () => {
  let component: PrincipalUsuarios;
  let fixture: ComponentFixture<PrincipalUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalUsuarios],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalUsuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
