import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CreerDemande } from './creer-demande';

describe('CreerDemande', () => {
  let component: CreerDemande;
  let fixture: ComponentFixture<CreerDemande>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreerDemande],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreerDemande);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
