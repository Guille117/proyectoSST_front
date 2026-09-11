import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabSwitch } from './tab-switch';

describe('TabSwitch', () => {
  let component: TabSwitch;
  let fixture: ComponentFixture<TabSwitch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabSwitch],
    }).compileComponents();

    fixture = TestBed.createComponent(TabSwitch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
