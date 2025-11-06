import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { tecnicoGuard } from './tecnico-guard';

describe('tecnicoGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => tecnicoGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
