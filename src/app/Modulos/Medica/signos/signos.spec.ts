import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Signos } from './signos';

describe('Signos', () => {
  let component: Signos;
  let fixture: ComponentFixture<Signos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Signos],
    }).compileComponents();

    fixture = TestBed.createComponent(Signos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
