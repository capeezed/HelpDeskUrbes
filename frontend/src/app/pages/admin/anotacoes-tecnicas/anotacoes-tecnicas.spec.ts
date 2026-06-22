import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnotacoesTecnicas } from './anotacoes-tecnicas';

describe('AnotacoesTecnicas', () => {
  let component: AnotacoesTecnicas;
  let fixture: ComponentFixture<AnotacoesTecnicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnotacoesTecnicas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnotacoesTecnicas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
