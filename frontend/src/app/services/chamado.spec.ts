import { TestBed } from '@angular/core/testing';

import { Chamado } from './chamado';

describe('Chamado', () => {
  let service: Chamado;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Chamado);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
