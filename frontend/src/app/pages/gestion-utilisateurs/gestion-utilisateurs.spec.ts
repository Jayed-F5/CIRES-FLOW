import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionUtilisateurs } from './gestion-utilisateurs';

describe('GestionUtilisateurs', () => {
  let component: GestionUtilisateurs;
  let fixture: ComponentFixture<GestionUtilisateurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionUtilisateurs],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionUtilisateurs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
