import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrincipalFarmacia } from './principal-farmacia';

describe('PrincipalFarmacia', () => {
  let component: PrincipalFarmacia;
  let fixture: ComponentFixture<PrincipalFarmacia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalFarmacia],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalFarmacia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
