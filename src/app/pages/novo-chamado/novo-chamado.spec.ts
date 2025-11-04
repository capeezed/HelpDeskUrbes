import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovoChamado } from './novo-chamado';

describe('NovoChamado', () => {
  let component: NovoChamado;
  let fixture: ComponentFixture<NovoChamado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NovoChamado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NovoChamado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
