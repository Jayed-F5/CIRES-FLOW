import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileGestion } from './file-gestion';

describe('FileGestion', () => {
  let component: FileGestion;
  let fixture: ComponentFixture<FileGestion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileGestion],
    }).compileComponents();

    fixture = TestBed.createComponent(FileGestion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
