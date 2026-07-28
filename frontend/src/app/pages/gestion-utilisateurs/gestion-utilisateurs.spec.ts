import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionUtilisateurs } from './gestion-utilisateurs';

describe('GestionUtilisateurs', () => {
  let component: GestionUtilisateurs;
  let fixture: ComponentFixture<GestionUtilisateurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionUtilisateurs],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionUtilisateurs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
