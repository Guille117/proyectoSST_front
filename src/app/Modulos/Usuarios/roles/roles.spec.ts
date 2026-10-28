import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RolService } from './data/rol-service';
import { Roles } from './roles';

describe('Roles', () => {
  let component: Roles;
  let fixture: ComponentFixture<Roles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roles],
      providers: [
        {
          provide: RolService,
          useValue: {
            getModulos: () => of([]),
            getRoles: () => of([]),
            buscarRoles: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Roles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
