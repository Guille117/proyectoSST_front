import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Camas } from './camas';

describe('Camas', () => {
  let component: Camas;
  let fixture: ComponentFixture<Camas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Camas],
    }).compileComponents();

    fixture = TestBed.createComponent(Camas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
