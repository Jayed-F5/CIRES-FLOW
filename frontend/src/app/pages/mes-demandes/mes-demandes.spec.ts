import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MesDemandes } from './mes-demandes';

describe('MesDemandes', () => {
  let component: MesDemandes;
  let fixture: ComponentFixture<MesDemandes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesDemandes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MesDemandes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
