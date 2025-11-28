import { TestBed } from '@angular/core/testing';

import { NavegacaoChamados } from './navegacao-chamados';

describe('NavegacaoChamados', () => {
  let service: NavegacaoChamados;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavegacaoChamados);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
