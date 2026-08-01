import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DetailDemande } from './detail-demande';

describe('DetailDemande', () => {
  let component: DetailDemande;
  let fixture: ComponentFixture<DetailDemande>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailDemande],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailDemande);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
