import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bajas } from './bajas';

describe('Bajas', () => {
  let component: Bajas;
  let fixture: ComponentFixture<Bajas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bajas],
    }).compileComponents();

    fixture = TestBed.createComponent(Bajas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
