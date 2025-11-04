import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalheChamado } from './detalhe-chamado';

describe('DetalheChamado', () => {
  let component: DetalheChamado;
  let fixture: ComponentFixture<DetalheChamado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetalheChamado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalheChamado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
