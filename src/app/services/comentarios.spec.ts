import { TestBed } from '@angular/core/testing';

import { Comentarios } from './comentarios';

describe('Comentarios', () => {
  let service: Comentarios;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Comentarios);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
