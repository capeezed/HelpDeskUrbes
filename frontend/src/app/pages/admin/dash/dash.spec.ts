import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dash } from './dash';

describe('Dash', () => {
  let component: Dash;
  let fixture: ComponentFixture<Dash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Dash]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dash);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
