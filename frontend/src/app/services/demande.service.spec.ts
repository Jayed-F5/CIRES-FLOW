import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DemandeService } from './demande.service';

describe('DemandeService', () => {
  let service: DemandeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DemandeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
