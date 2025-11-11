import { TestBed } from '@angular/core/testing';

import { ClientAccountService } from './client-account.service';

describe('ClientAccountService', () => {
  let service: ClientAccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientAccountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
