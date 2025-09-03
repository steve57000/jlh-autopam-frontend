import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { hydrationReadyGuard } from './hydration-ready.guard';

describe('hydrationReadyGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => hydrationReadyGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
