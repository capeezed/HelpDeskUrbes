import { TestBed } from '@angular/core/testing';

import { Socket } from './websocket';

describe('Socket', () => {
  let service: Socket;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Socket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
