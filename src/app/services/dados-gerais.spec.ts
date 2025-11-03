import { TestBed } from '@angular/core/testing';

import { DadosGerais } from './dados-gerais';

describe('DadosGerais', () => {
  let service: DadosGerais;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DadosGerais);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
