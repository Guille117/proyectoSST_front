import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usu } from './usu';

describe('Usu', () => {
  let component: Usu;
  let fixture: ComponentFixture<Usu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usu],
    }).compileComponents();

    fixture = TestBed.createComponent(Usu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
