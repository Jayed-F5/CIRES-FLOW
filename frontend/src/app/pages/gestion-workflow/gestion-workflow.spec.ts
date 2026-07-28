import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionWorkflow } from './gestion-workflow';

describe('GestionWorkflow', () => {
  let component: GestionWorkflow;
  let fixture: ComponentFixture<GestionWorkflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionWorkflow],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionWorkflow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
