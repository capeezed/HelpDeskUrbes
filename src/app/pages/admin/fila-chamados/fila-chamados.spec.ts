import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilaChamados } from './fila-chamados';

describe('FilaChamados', () => {
  let component: FilaChamados;
  let fixture: ComponentFixture<FilaChamados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilaChamados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilaChamados);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
