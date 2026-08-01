import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionDepartements } from './gestion-departements';

describe('GestionDepartements', () => {
  let component: GestionDepartements;
  let fixture: ComponentFixture<GestionDepartements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDepartements],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionDepartements);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
